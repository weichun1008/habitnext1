// src/lib/anchors.js
// Curated list of common daily transition moments, used as anchor candidates
// in AnchorPicker. The `id` is React key only; `label` is the string written
// to Task.cue. Items are grouped by `timeOfDay` in the UI.

export const LIFE_MOMENTS = [
  // 早晨 (morning)
  { id: 'wake_up',           label: '起床後',                   timeOfDay: 'morning' },
  { id: 'first_water',       label: '喝完第一杯水後',           timeOfDay: 'morning' },
  { id: 'after_brushing',    label: '刷完牙後',                 timeOfDay: 'morning' },
  { id: 'after_washing',     label: '洗完臉後',                 timeOfDay: 'morning' },
  { id: 'after_breakfast',   label: '吃完早餐後',               timeOfDay: 'morning' },
  { id: 'leaving_home',      label: '出門前',                   timeOfDay: 'morning' },
  { id: 'arrive_work',       label: '到辦公室／工作場所後',     timeOfDay: 'morning' },

  // 中午 (noon)
  { id: 'before_lunch',      label: '午餐前',                   timeOfDay: 'noon' },
  { id: 'after_lunch',       label: '午餐後',                   timeOfDay: 'noon' },
  { id: 'midday_break',      label: '午間休息時',               timeOfDay: 'noon' },

  // 晚上 (evening)
  { id: 'leaving_work',      label: '下班離開工作場所後',       timeOfDay: 'evening' },
  { id: 'arrive_home',       label: '回家進門後',               timeOfDay: 'evening' },
  { id: 'before_dinner',     label: '晚餐前',                   timeOfDay: 'evening' },
  { id: 'after_dinner',      label: '晚餐後',                   timeOfDay: 'evening' },
  { id: 'after_shower',      label: '洗完澡後',                 timeOfDay: 'evening' },
  { id: 'before_bed',        label: '上床睡覺前',               timeOfDay: 'evening' },
  { id: 'bedtime',           label: '睡前躺上床後',             timeOfDay: 'evening' },
  { id: 'lights_off',        label: '關燈前',                   timeOfDay: 'evening' },

  // 工作 (work)
  { id: 'before_work',       label: '開電腦／開始工作前',       timeOfDay: 'work' },
  { id: 'first_unlock',      label: '手機第一次解鎖時',         timeOfDay: 'work' },
  { id: 'coffee_tea',        label: '泡咖啡／泡茶時',           timeOfDay: 'work' },
  { id: 'after_meeting',     label: '結束一個會議後',           timeOfDay: 'work' },
  { id: 'task_done',         label: '完成一項任務後',           timeOfDay: 'work' },
  { id: 'stand_break',       label: '站起來伸展時',             timeOfDay: 'work' },

  // 通勤 (commute)
  { id: 'commute',           label: '通勤路上',                 timeOfDay: 'commute' },
  { id: 'waiting_transport', label: '等公車／捷運時',           timeOfDay: 'commute' },
  { id: 'red_light',         label: '等紅綠燈時',               timeOfDay: 'commute' },

  // 任意時刻 (any)
  { id: 'waiting',           label: '排隊／等候時',             timeOfDay: 'any' },
  { id: 'before_social',     label: '打開社群媒體前',           timeOfDay: 'any' },
  { id: 'feel_stressed',     label: '感到壓力時',               timeOfDay: 'any' },
];

export const TIME_OF_DAY_LABELS = {
  morning: '早晨',
  noon:    '中午',
  evening: '晚上',
  work:    '工作',
  commute: '通勤',
  any:     '任意時刻',
};

// Ordered groups of LIFE_MOMENTS for rendering.
export const LIFE_MOMENTS_GROUPED = ['morning', 'noon', 'evening', 'work', 'commute', 'any']
  .map(key => ({
    key,
    title: TIME_OF_DAY_LABELS[key],
    items: LIFE_MOMENTS.filter(m => m.timeOfDay === key),
  }))
  .filter(g => g.items.length > 0);

export const CUSTOM_ANCHOR_MAX_LENGTH = 30;
