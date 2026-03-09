import { Globe } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LanguageSelector = ({ language, setLanguage }) => {
  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "uk", name: "Українська", flag: "🇺🇦" },
    { code: "th", name: "ไทย", flag: "🇹🇭" },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="language-selector"
          className="glass-card border-white/10 gap-2"
        >
          <Globe size={16} />
          <span>{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="glass-card border-white/10">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            data-testid={`lang-${lang.code}`}
            className={`cursor-pointer ${
              language === lang.code ? "bg-cyan-500/20 text-cyan-400" : ""
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;