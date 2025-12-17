import { z } from "zod";
import { Tool } from "./base.ts";
import type { ToolResult } from "../agent/types.ts";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 高德地图天气 API 返回数据类型定义
 */
interface AmapWeatherResponse {
  status: string;
  info: string;
  infocode: string;
  lives?: AmapLiveWeather[];
  forecasts?: AmapForecastWeather[];
}

interface AmapLiveWeather {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
}

interface AmapForecastWeather {
  city: string;
  adcode: string;
  province: string;
  reporttime: string;
  casts: AmapCast[];
}

interface AmapCast {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  nightwind: string;
  daypower: string;
  nightpower: string;
}

/**
 * 天气查询工具（使用高德地图 API）
 * 
 * 使用高德地图天气 API 查询天气信息
 * 需要配置环境变量：AMAP_API_KEY
 * 
 * 获取 API Key: https://console.amap.com/dev/key/app
 * 注册高德开放平台账号后创建应用获取 key
 */
export class WeatherTool extends Tool {
  name = "weather";
  description = "查询指定城市的天气信息，支持实时天气和天气预报（需要配置 AMAP_API_KEY）";

  schema = z.object({
    city: z.string().describe("要查询天气的城市名称（中文）"),
    forecast: z.boolean().optional().describe("是否查询天气预报，默认为 false（实时天气）"),
  });

  private amapApiKey?: string;
  private readonly cityCodeMap: Record<string, string>;

  constructor() {
    super();
    this.amapApiKey = process.env.AMAP_API_KEY;
    
    // 从JSON文件加载城市编码数据
    try {
      const jsonPath = join(__dirname, '../utils/city-codes.json');
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      this.cityCodeMap = JSON.parse(jsonContent);
    } catch (error) {
      console.error('加载城市编码数据失败:', error);
      this.cityCodeMap = {};
    }
  }

  async execute(input: any): Promise<ToolResult> {
    try {
      const normalizedInput = typeof input === 'string' ? { city: input } : input;
      const parsed = this.schema.parse(normalizedInput);
      const { city, forecast = false } = parsed;

      // 检查是否配置了 API Key
      if (!this.amapApiKey) {
        return {
          success: false,
          error: "未配置 AMAP_API_KEY 环境变量，无法查询天气。请在 .env 文件中配置或通过 https://console.amap.com/dev/key/app 获取 API Key",
        };
      }

      return await this.getWeatherFromAmapAPI(city, forecast);
    } catch (error) {
      return {
        success: false,
        error: `查询天气失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 获取城市编码，支持灵活匹配
   */
  private getCityCode(cityName: string): string | null {
    // 1. 精确匹配
    if (this.cityCodeMap[cityName]) {
      return this.cityCodeMap[cityName] ?? null;
    }
    
    // 2. 尝试添加"市"后缀
    const withCity = this.cityCodeMap[`${cityName}市`];
    if (withCity) {
      return withCity;
    }
    
    // 3. 尝试添加"省"后缀
    const withProvince = this.cityCodeMap[`${cityName}省`];
    if (withProvince) {
      return withProvince;
    }
    
    // 4. 尝试移除"市"或"省"后缀
    const withoutSuffix = cityName.replace(/[市省区县]$/, '');
    if (withoutSuffix !== cityName) {
      const code = this.cityCodeMap[withoutSuffix];
      if (code) {
        return code;
      }
    }
    
    // 5. 模糊匹配 - 查找包含该名称的城市
    for (const [name, code] of Object.entries(this.cityCodeMap)) {
      if (name.includes(cityName) || cityName.includes(name)) {
        return code;
      }
    }
    
    return null;
  }

  /**
   * 从高德地图 API 获取天气数据
   */
  private async getWeatherFromAmapAPI(city: string, forecast: boolean): Promise<ToolResult> {
    // 获取城市编码
    const cityCode = this.getCityCode(city);
    if (!cityCode) {
      // 提供一些热门城市的建议
      const popularCities = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '西安市', '南京市', '重庆市'];
      return {
        success: false,
        error: `未找到城市"${city}"的编码。请尝试使用完整的城市名称，例如：${popularCities.slice(0, 5).join('、')}等。支持全国所有省市区县。`,
      };
    }

    try {
      // 调用高德地图天气 API
      const url = new URL("https://restapi.amap.com/v3/weather/weatherInfo");
      url.searchParams.set("key", this.amapApiKey!);
      url.searchParams.set("city", cityCode);
      url.searchParams.set("extensions", forecast ? "all" : "base");

      const response = await fetch(url.toString());

      if (!response.ok) {
        return {
          success: false,
          error: `API 请求失败: HTTP ${response.status}`,
        };
      }

      const data = await response.json() as AmapWeatherResponse;

      // 检查响应状态
      if (data.status !== "1") {
        return {
          success: false,
          error: `API 返回错误: ${data.info} (${data.infocode})`,
        };
      }

      if (!data.lives && !data.forecasts) {
        return {
          success: false,
          error: "API 未返回天气数据",
        };
      }

      // 根据查询类型返回不同格式的数据
      if (forecast) {
        // 天气预报
        if (!data.forecasts || data.forecasts.length === 0) {
          return {
            success: false,
            error: "未获取到天气预报数据",
          };
        }

        const forecastData = data.forecasts[0]!;
        const casts = forecastData.casts;
        
        let result = `${city}未来几天天气预报：\n`;
        casts.forEach((cast) => {
          result += `\n${cast.date} (${cast.week})：`;
          result += `白天${cast.dayweather}，${cast.daytemp}°C，${cast.daywind}风${cast.daypower}级；`;
          result += `夜间${cast.nightweather}，${cast.nighttemp}°C，${cast.nightwind}风${cast.nightpower}级`;
        });

        return {
          success: true,
          data: result,
        };
      } else {
        // 实时天气
        if (!data.lives || data.lives.length === 0) {
          return {
            success: false,
            error: "未获取到实时天气数据",
          };
        }

        const liveData = data.lives[0]!;
        const result = `${city}实时天气：${liveData.weather}，温度 ${liveData.temperature}°C，湿度 ${liveData.humidity}%，${liveData.winddirection}风${liveData.windpower}级，更新时间：${liveData.reporttime}`;

        return {
          success: true,
          data: result,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `API 调用失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

}





