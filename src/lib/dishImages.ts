import beetroot from "@/assets/dish-beetroot.jpg";
import turbot from "@/assets/dish-turbot.jpg";
import ribeye from "@/assets/dish-ribeye.jpg";
import tomato from "@/assets/dish-tomato.jpg";
import sourdough from "@/assets/dish-sourdough.jpg";
import oysters from "@/assets/dish-oysters.jpg";
import gnocchi from "@/assets/dish-gnocchi.jpg";
import celeriac from "@/assets/dish-celeriac.jpg";
import burrata from "@/assets/dish-burrata.jpg";
import tart from "@/assets/dish-tart.jpg";
import caesar from "@/assets/dish-caesar.jpg";
import pannacotta from "@/assets/dish-pannacotta.jpg";

export const dishImages: Record<string, string> = {
  "dish-beetroot": beetroot,
  "dish-turbot": turbot,
  "dish-ribeye": ribeye,
  "dish-tomato": tomato,
  "dish-sourdough": sourdough,
  "dish-oysters": oysters,
  "dish-gnocchi": gnocchi,
  "dish-celeriac": celeriac,
  "dish-burrata": burrata,
  "dish-tart": tart,
  "dish-caesar": caesar,
  "dish-pannacotta": pannacotta,
};

export function dishImage(key: string): string {
  return dishImages[key] ?? beetroot;
}
