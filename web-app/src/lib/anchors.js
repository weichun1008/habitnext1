// src/lib/anchors.js
// Curated list of common daily transition moments, used as anchor candidates
// in AnchorPicker. The `id` is React key only; `label` is the string written
// to Task.cue.

export const LIFE_MOMENTS = [
  { id: 'wake_up',        label: '起床後',                   timeOfDay: 'morning' },
  { id: 'after_brushing', label: '刷完牙後',                 timeOfDay: 'morning' },
  { id: 'first_water',    label: '喝完第一杯水後',           timeOfDay: 'morning' },
  { id: 'leaving_home',   label: '出門前',                   timeOfDay: 'morning' },
  { id: 'arrive_work',    label: '到辦公室／工作場所後',     timeOfDay: 'morning' },
  { id: 'after_lunch',    label: '午餐後',                   timeOfDay: 'noon' },
  { id: 'arrive_home',    label: '回家進門後',               timeOfDay: 'evening' },
  { id: 'after_dinner',   label: '晚餐後',                   timeOfDay: 'evening' },
  { id: 'after_shower',   label: '洗完澡後',                 timeOfDay: 'evening' },
  { id: 'bedtime',        label: '睡前躺上床後',             timeOfDay: 'evening' },
  { id: 'coffee_tea',     label: '等待煮咖啡／泡茶時',       timeOfDay: 'any' },
  { id: 'before_work',    label: '開電腦／開始工作前',       timeOfDay: 'work' },
  { id: 'first_unlock',   label: '看到手機螢幕第一次解鎖時', timeOfDay: 'work' },
  { id: 'commute',        label: '通勤路上',                 timeOfDay: 'commute' },
  { id: 'waiting',        label: '排隊／等候時',             timeOfDay: 'any' },
];

export const CUSTOM_ANCHOR_MAX_LENGTH = 30;
