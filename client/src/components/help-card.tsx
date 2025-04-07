import { Card, CardContent } from "@/components/ui/card";

export function HelpCard() {
  return (
    <Card className="bg-slate-100 mb-6">
      <CardContent className="pt-6">
        <h3 className="font-medium mb-2 text-slate-700">Як користуватися:</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li className="flex items-start">
            <span className="text-[#8b5cf6] mr-2">•</span>
            <span>Додавайте час, коли Макс прокидається або засинає</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#f97316] mr-2">•</span>
            <span>Записи повинні чергуватися між пробудженням і сном</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Перегляньте зведення зверху, щоб побачити метрики сну</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span>Використовуйте селектор дати, щоб переглядати або додавати записи для різних днів</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span>Виберіть дату з історії, щоб побачити попередні схеми сну</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
