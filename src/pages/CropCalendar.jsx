import { useMemo } from "react";

import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { useLanguage } from "../i18n/LanguageContext";

import {
  CalendarDays,
  Sprout,
  Droplets,
  Leaf,
  ShieldAlert,
  Sparkles,
  MapPin,
} from "lucide-react";

// Temporary region — later this should come from the logged-in profile.
const USER_DISTRICT = "Peshawar District";
const USER_PROVINCE = "Khyber Pakhtunkhwa";

const cropCalendarData = [
  {
    crop: "Wheat",
    cropUr: "گندم",
    season: "Rabi",
    seasonUr: "ربیع",
    sowing: "October – December",
    sowingUr: "اکتوبر – دسمبر",
    sowingMonths: [10, 11, 12],
    harvest: "April – May",
    harvestUr: "اپریل – مئی",
    irrigation: "Irrigate according to soil moisture, with particular attention around crown-root initiation, flowering and grain development.",
    irrigationUr: "مٹی کی نمی کے مطابق آبپاشی کریں، خاص طور پر جڑ بننے، پھول آنے اور دانہ بننے کے مرحلوں میں پانی پر خاص توجہ دیں۔",
    fertilizer: "Apply fertilizer according to soil condition and local agricultural recommendations. Split nitrogen applications where appropriate.",
    fertilizerUr: "مٹی کی حالت اور مقامی زرعی سفارشات کے مطابق کھاد دیں۔ جہاں مناسب ہو نائٹروجن کی مقدار مختلف اوقات میں تقسیم کریں۔",
    diseaseWatch: "Monitor for rust, aphids and other locally reported wheat diseases or pests.",
    diseaseWatchUr: "کنگی، چیپا اور گندم کی مقامی بیماریوں یا کیڑوں کی نگرانی کریں۔",
  },
  {
    crop: "Maize",
    cropUr: "مکئی",
    season: "Kharif / Spring",
    seasonUr: "خریف / بہار",
    sowing: "February – March or June – July",
    sowingUr: "فروری – مارچ یا جون – جولائی",
    sowingMonths: [2, 3, 6, 7],
    harvest: "May – June / September – October",
    harvestUr: "مئی – جون / ستمبر – اکتوبر",
    irrigation: "Avoid prolonged moisture stress, particularly during flowering and grain formation.",
    irrigationUr: "خاص طور پر پھول آنے اور دانہ بننے کے دوران لمبے عرصے تک پانی کی کمی نہ ہونے دیں۔",
    fertilizer: "Base fertilizer use on soil condition and local extension guidance. Avoid unnecessary application during severe water stress.",
    fertilizerUr: "کھاد مٹی کی حالت اور مقامی زرعی رہنمائی کے مطابق دیں۔ شدید پانی کی کمی کے دوران غیر ضروری کھاد سے بچیں۔",
    diseaseWatch: "Watch for stem borers, leaf diseases and signs of heat or moisture stress.",
    diseaseWatchUr: "تنا چھیدنے والے کیڑے، پتوں کی بیماریوں اور گرمی یا نمی کی کمی کی علامات دیکھتے رہیں۔",
  },
  {
    crop: "Sugarcane",
    cropUr: "گنا",
    season: "Annual",
    seasonUr: "سالانہ",
    sowing: "February – March",
    sowingUr: "فروری – مارچ",
    sowingMonths: [2, 3],
    harvest: "Following maturity",
    harvestUr: "پختگی کے بعد",
    irrigation: "Maintain adequate soil moisture while avoiding waterlogging. Irrigation demand increases during hot and dry periods.",
    irrigationUr: "مٹی میں مناسب نمی برقرار رکھیں لیکن پانی کھڑا نہ ہونے دیں۔ گرم اور خشک موسم میں آبپاشی کی ضرورت بڑھ جاتی ہے۔",
    fertilizer: "Use soil-based nutrient management and split applications according to crop stage.",
    fertilizerUr: "مٹی کی حالت کے مطابق غذائی اجزا دیں اور فصل کے مرحلے کے لحاظ سے کھاد تقسیم کر کے دیں۔",
    diseaseWatch: "Monitor for borers, red rot and other locally reported sugarcane problems.",
    diseaseWatchUr: "گنے کے بورر، سرخ سڑن اور دیگر مقامی مسائل کی نگرانی کریں۔",
  },
  {
    crop: "Rice",
    cropUr: "چاول",
    season: "Kharif",
    seasonUr: "خریف",
    sowing: "May – July",
    sowingUr: "مئی – جولائی",
    sowingMonths: [5, 6, 7],
    harvest: "September – November",
    harvestUr: "ستمبر – نومبر",
    irrigation: "Maintain adequate water during establishment and reproductive growth while avoiding unnecessary water loss.",
    irrigationUr: "ابتدائی نشوونما اور تولیدی مرحلے میں مناسب پانی برقرار رکھیں اور غیر ضروری پانی کے ضیاع سے بچیں۔",
    fertilizer: "Apply nutrients according to soil condition, crop stage and local agricultural recommendations.",
    fertilizerUr: "مٹی کی حالت، فصل کے مرحلے اور مقامی زرعی سفارشات کے مطابق غذائی اجزا دیں۔",
    diseaseWatch: "Monitor for blast, bacterial diseases, stem borers and other locally reported rice problems.",
    diseaseWatchUr: "بلاسٹ، بیکٹیریا کی بیماریاں، تنا چھیدنے والے کیڑے اور چاول کے دیگر مقامی مسائل کی نگرانی کریں۔",
  },
  {
    crop: "Potato",
    cropUr: "آلو",
    season: "Rabi / Autumn",
    seasonUr: "ربیع / خزاں",
    sowing: "September – November",
    sowingUr: "ستمبر – نومبر",
    sowingMonths: [9, 10, 11],
    harvest: "January – March",
    harvestUr: "جنوری – مارچ",
    irrigation: "Keep soil moisture reasonably consistent, especially during tuber formation, while avoiding waterlogging.",
    irrigationUr: "خاص طور پر آلو بننے کے مرحلے میں مٹی کی نمی مناسب اور مسلسل رکھیں، مگر پانی کھڑا نہ ہونے دیں۔",
    fertilizer: "Use balanced fertilizer according to soil condition and crop requirements.",
    fertilizerUr: "مٹی کی حالت اور فصل کی ضرورت کے مطابق متوازن کھاد استعمال کریں۔",
    diseaseWatch: "Monitor for late blight, early blight, aphids and tuber-related disease symptoms.",
    diseaseWatchUr: "لیٹ بلائٹ، ارلی بلائٹ، چیپا اور آلو سے متعلق بیماریوں کی علامات کی نگرانی کریں۔",
  },
  {
    crop: "Vegetables",
    cropUr: "سبزیاں",
    season: "Seasonal",
    seasonUr: "موسمی",
    sowing: "Varies by vegetable and season",
    sowingUr: "سبزی اور موسم کے مطابق مختلف",
    sowingMonths: [],
    harvest: "Varies by crop",
    harvestUr: "فصل کے مطابق مختلف",
    irrigation: "Use frequent but efficient irrigation according to crop type, soil moisture and temperature.",
    irrigationUr: "فصل کی قسم، مٹی کی نمی اور درجہ حرارت کے مطابق بار بار مگر مؤثر آبپاشی کریں۔",
    fertilizer: "Use crop-specific nutrient management and avoid excessive fertilizer application.",
    fertilizerUr: "فصل کے مطابق غذائی اجزا دیں اور ضرورت سے زیادہ کھاد استعمال نہ کریں۔",
    diseaseWatch: "Inspect crops regularly for insects, fungal disease, wilting and heat or drought stress.",
    diseaseWatchUr: "کیڑوں، پھپھوندی، مرجھاؤ اور گرمی یا خشک سالی کے دباؤ کے لیے فصلوں کا باقاعدہ معائنہ کریں۔",
  },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_UR = [
  "جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون",
  "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر",
];

export default function CropCalendar() {
  const { t, lang } = useLanguage();
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = (lang === "ur" ? MONTH_NAMES_UR : MONTH_NAMES)[currentMonth - 1];

  const crops = useMemo(() => {
    return [...cropCalendarData].sort((a, b) => {
      const aActive = a.sowingMonths.includes(currentMonth);
      const bActive = b.sowingMonths.includes(currentMonth);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.crop.localeCompare(b.crop);
    });
  }, [currentMonth]);

  const text = (crop, key) => lang === "ur" ? crop[`${key}Ur`] || crop[key] : crop[key];

  return (
    <>
      <Topbar title={t("ptCropCalendarTitle")} subtitle={`${USER_DISTRICT} — ${USER_PROVINCE}`} />

      <main className="farmer-page p-4 sm:p-8 space-y-6" dir={lang === "ur" ? "rtl" : "ltr"}>
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> {t("calendarSeasonalPlanning")}</span>
                <h2 className="farmer-hero-title">{t("calendarFor")} {USER_DISTRICT}</h2>
                <p className="farmer-hero-copy">{t("calendarHeroBody")}</p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {USER_PROVINCE}</span>
                  <span className="farmer-hero-button"><CalendarDays size={14} /> {currentMonthName}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"><Sprout size={22} /></div>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>{t("calendarCrops")}</span><strong>{crops.length}</strong></div>
              <div className="farmer-hero-stat"><span>{t("calendarSowingNow")}</span><strong>{crops.filter((crop) => crop.sowingMonths.includes(currentMonth)).length}</strong></div>
              <div className="farmer-hero-stat"><span>{t("calendarCurrentMonth")}</span><strong>{currentMonthName}</strong></div>
            </div>
          </div>
        </section>

        <Card scan>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">{t("calendarRegional")}</p>
              <p className="font-display font-semibold mt-1">{USER_DISTRICT}</p>
              <p className="text-sm text-ink/50 mt-1">{USER_PROVINCE}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays size={19} className="text-primary" /></div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">{t("calendarCurrentMonth")}</p>
                <p className="font-medium">{currentMonthName}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Sprout size={17} className="text-primary" /></div>
            <div>
              <p className="font-medium text-sm">{t("calendarCurrentWindows")}</p>
              <p className="text-sm text-ink/55 mt-1">
                {crops.filter((crop) => crop.sowingMonths.includes(currentMonth)).length > 0
                  ? crops.filter((crop) => crop.sowingMonths.includes(currentMonth)).map((crop) => text(crop, "crop")).join(lang === "ur" ? "، " : ", ")
                  : t("calendarNoSowing")}
              </p>
            </div>
          </div>
        </Card>

        {crops.map((crop) => {
          const sowingNow = crop.sowingMonths.includes(currentMonth);
          return (
            <Card key={crop.crop} className="farmer-form-card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold">{text(crop, "crop")}</p>
                    {sowingNow && <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">{t("calendarSowingNowBadge")}</span>}
                  </div>
                  <p className="text-xs text-ink/40 mt-1">{USER_PROVINCE}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{text(crop, "season")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 text-sm">
                <CalendarItem icon={Sprout} label={t("calendarSowingWindow")} text={text(crop, "sowing")} />
                <CalendarItem icon={CalendarDays} label={t("calendarHarvest")} text={text(crop, "harvest")} />
                <CalendarItem icon={Droplets} label={t("calendarIrrigation")} text={text(crop, "irrigation")} />
                <CalendarItem icon={Leaf} label={t("calendarFertilizer")} text={text(crop, "fertilizer")} />
                <CalendarItem icon={ShieldAlert} label={t("calendarDiseaseWatch")} text={text(crop, "diseaseWatch")} />
              </div>
            </Card>
          );
        })}

        <Card>
          <p className="text-xs text-ink/45 leading-relaxed">
            {lang === "ur"
              ? "فصل کے اوقات مقامی موسم، بلندی، فصل کی قسم اور کھیت کی حالت کے مطابق مختلف ہو سکتے ہیں۔ یہ کیلنڈر عمومی علاقائی رہنمائی دیتا ہے۔ حتمی بوائی، آبپاشی اور کھاد کے فیصلے مقامی زرعی ماہرین اور کھیت کی اصل حالت کے مطابق کریں۔"
              : "Crop timing can vary with local climate, elevation, crop variety and field conditions. This calendar provides general regional guidance. Final sowing, irrigation and fertilizer decisions should follow local agricultural extension recommendations and field conditions."}
          </p>
        </Card>
      </main>
    </>
  );
}

function CalendarItem({ icon: Icon, label, text }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={14} className="text-primary" />
        <p className="text-xs uppercase text-ink/40 font-medium">{label}</p>
      </div>
      <p className="text-ink/70 leading-relaxed">{text}</p>
    </div>
  );
}
