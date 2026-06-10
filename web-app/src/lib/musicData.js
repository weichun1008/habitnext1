const PROBLEMS = [
  {
    id: 'stress',
    title: '壓力型：腦袋停不下來',
    titleKey: 'music.problems.stress.title',
    description: '大腦停不下來，越晚越清醒。躺下後還在想事情',
    recommendedCategoryId: 'calm',
    imageUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'circadian',
    title: '節律型：明明很累卻睡不著',
    titleKey: 'music.problems.circadian.title',
    description: '到了睡覺時間，身體卻還沒準備好。',
    recommendedCategoryId: 'routine',
    imageUrl: 'https://images.unsplash.com/photo-1513628253939-010e64ac66cd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'metabolic',
    title: '代謝失衡型：半夜易醒',
    titleKey: 'music.problems.metabolic.title',
    description: '容易半夜醒來，醒了就很難再睡。',
    recommendedCategoryId: 'guard',
    imageUrl: 'https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'hormonal',
    title: '荷爾蒙波動型：身體起伏大',
    titleKey: 'music.problems.hormonal.title',
    description: '身體狀態起伏大，睡眠也跟著受影響。',
    recommendedCategoryId: 'relax',
    imageUrl: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800'
  },
];

const CATEGORIES = [
  { id: 'calm', title: '安撫腦袋', titleKey: 'music.categories.calm.title', description: '幫助腦袋慢下來，適合睡前反芻多的人', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800' },
  { id: 'routine', title: '固定作息', titleKey: 'music.categories.routine.title', description: '幫助建立睡前訊號，適合作息容易延後的人', imageUrl: 'https://images.unsplash.com/photo-1445905595283-21f8ae8a33d2?auto=format&fit=crop&q=80&w=800' },
  { id: 'guard', title: '整夜守護', titleKey: 'music.categories.guard.title', description: '降低夜醒干擾，適合半夜容易醒來的人', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800' },
  { id: 'relax', title: '身體放鬆', titleKey: 'music.categories.relax.title', description: '減少身體不適感，適合容易受身體狀態影響的人', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800' },
];

const TRACKS = [
  // 安撫腦袋 (Stress)
  { id: 't1', title: '夜雨入眠', categoryId: 'calm', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=800', oneLiner: '溫和的慢鋼琴＋輕雨聲，帶走一天的煩躁。', suitableFor: '躺著還在想今天發生的事', effect: '可能幫助思緒沉澱，緩慢進入放鬆狀態', tags: ['環境音', '放鬆大腦', '慢節奏（60–80 BPM）'] },
  { id: 't2', title: '慢下來', categoryId: 'calm', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800', oneLiner: '放緩的吉他＋輕柔 Pad，適合睡前心很累的你。', suitableFor: '覺得大腦充滿雜念', effect: '幫助轉移注意力，平撫焦慮感', tags: ['有旋律', '放鬆大腦', '慢節奏（60–88 BPM）'] },
  { id: 't3', title: '關機儀式', categoryId: 'calm', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻環境＋遠端鋼琴，像睡前的「關機聲」。', suitableFor: '需要明確的休息訊號', effect: '提供安定的聽覺屏障', tags: ['低頻感強', '放鬆大腦', '無節奏'] },
  { id: 't4', title: '不再想', categoryId: 'calm', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800', oneLiner: '緩慢鋼琴＋弦樂，適合反覆在腦裡排練明天的人。', suitableFor: '躺著還在想今天發生的事', effect: '可能幫助思緒沉澱，緩慢進入放鬆狀態', tags: ['有旋律', '放鬆大腦', '慢節奏（60–80 BPM）'] },
  { id: 't5', title: '夜裡的擁抱', categoryId: 'calm', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻 Pad＋大提琴，像睡前被溫柔包圍。', suitableFor: '需要溫柔的安撫感', effect: '幫助轉移注意力，平撫焦慮感', tags: ['有旋律', '放鬆大腦', '柔和高頻'] },
  { id: 't6', title: '煩惱留在門外', categoryId: 'calm', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&q=80&w=800', oneLiner: '環境風聲＋低頻 Drone，讓腦子慢慢放空。', suitableFor: '覺得大腦充滿雜念', effect: '引導呼吸變慢，配合節奏放鬆', tags: ['環境音', '放鬆大腦', '低頻感強'] },
  { id: 't7', title: '深夜角落', categoryId: 'calm', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800', oneLiner: '低保真鋼琴循環，適合熬夜後只想放鬆的你。', suitableFor: '想在安靜空間沉澱', effect: '可能幫助思緒沉澱，緩慢進入放鬆狀態', tags: ['有旋律', '放鬆大腦', '慢節奏（60–80 BPM）'] },
  { id: 't8', title: '夜裡安靜時', categoryId: 'calm', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800', oneLiner: '純環境 Pad＋遠處鳥鳴，適合靜下來深呼吸。', suitableFor: '需要外在聲音來蓋過內心對話', effect: '幫助轉移注意力，平撫焦慮感', tags: ['環境音', '放鬆大腦', '無節奏'] },
  { id: 't9', title: '緊張褪去', categoryId: 'calm', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=800', oneLiner: '慢鋼琴＋少量 Pad，讓情緒慢慢放下。', suitableFor: '躺著還在想今天發生的事', effect: '可能幫助思緒沉澱，緩慢進入放鬆狀態', tags: ['有旋律', '放鬆大腦', '慢節奏（60–80 BPM）'] },
  { id: 't10', title: '自我和解', categoryId: 'calm', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', oneLiner: '溫暖 Pad＋遠端鋼琴，適合睡前與自己和解的時刻。', suitableFor: '覺得大腦充滿雜念', effect: '引導呼吸變慢，配合節奏放鬆', tags: ['有旋律', '放鬆大腦', '柔和高頻'] },

  // 固定作息 (Circadian)
  { id: 't11', title: '關機時鐘', categoryId: 'routine', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800', oneLiner: '重複鋼琴＋穩定節奏，像睡前 10 點的固定儀式。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '建立「該睡覺了」的制約反應', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't12', title: '漸暗燈光', categoryId: 'routine', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻 Drone＋淡淡鋼琴，像房間慢慢變暗。', suitableFor: '身體還很亢奮，需要慢慢降速', effect: '引導呼吸變慢，配合節奏放鬆', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't13', title: '早點回家', categoryId: 'routine', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800', oneLiner: '木吉他＋輕柔 Pad，讓你有「早點睡也沒關係」的感覺。', suitableFor: '喜歡固定頻率帶來安定感的人', effect: '建立「該睡覺了」的制約反應', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't14', title: '週末早睡', categoryId: 'routine', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', oneLiner: '低保真節奏＋鋼琴循環，適合週末也不想熬夜的你。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '幫助身體進入穩定休眠期', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't15', title: '起床時鐘', categoryId: 'routine', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=800', oneLiner: '逐漸變亮的環境音，像早晨的光線慢慢出現。', suitableFor: '需要規律節奏轉移注意力', effect: '建立「該睡覺了」的制約反應', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't16', title: '時鐘陪伴', categoryId: 'routine', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800', oneLiner: '溫柔「滴答」節拍＋低頻，適合晚睡型的你。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '引導呼吸變慢，配合節奏放鬆', tags: ['有旋律', '固定作息', '低頻感強'] },
  { id: 't17', title: '時間錨點', categoryId: 'routine', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800', oneLiner: '重複 Synth 短句，像你的新的「睡前時間錨」。', suitableFor: '喜歡固定頻率帶來安定感的人', effect: '幫助身體進入穩定休眠期', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't18', title: '規律節奏', categoryId: 'routine', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻脈動＋環境底色，讓大腦慢慢進入規律狀態。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '建立「該睡覺了」的制約反應', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't19', title: '不再拖延', categoryId: 'routine', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&q=80&w=800', oneLiner: '木吉他循環＋輕柔 Pad，幫助你放下「再滑一下」。', suitableFor: '身體還很亢奮，需要慢慢降速', effect: '引導呼吸變慢，配合節奏放鬆', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },
  { id: 't20', title: '起床之光', categoryId: 'routine', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=800', oneLiner: '逐漸變亮的環境音樂，適合想提早醒來的你。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '幫助身體進入穩定休眠期', tags: ['有旋律', '固定作息', '慢節奏（60–80 BPM）'] },

  // 整夜守護 (Metabolic)
  { id: 't21', title: '三點風聲', categoryId: 'guard', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=800', oneLiner: '粉紅噪音混合輕風，像在凌晨三點給你一條安靜的後退路線。', suitableFor: '半夜容易被細微聲音驚醒', effect: '減少夜醒次數，維持睡眠深度', tags: ['純噪音', '整夜守護', '整夜可播放'] },
  { id: 't22', title: '血糖守夜', categoryId: 'guard', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻脈動粉紅噪音，像在體內輕輕守護你的血糖波動。', suitableFor: '清晨容易提早醒來', effect: '整夜提供穩定的聽覺覆蓋', tags: ['純噪音', '整夜守護', '低頻感強'] },
  { id: 't23', title: '靜謐之夜', categoryId: 'guard', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=800', oneLiner: '深層的低頻與環境音，讓身體不適感逐漸平息。', suitableFor: '半夜容易被細微聲音驚醒', effect: '減少夜醒次數，維持睡眠深度', tags: ['無歌詞', '整夜守護', '低頻感強'] },
  { id: 't24', title: '夜裡不驚醒', categoryId: 'guard', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻棕色噪音，像在夜裡幫你蓋住所有突發聲音。', suitableFor: '清晨容易提早醒來', effect: '創造熟悉的安撫環境', tags: ['純噪音', '整夜守護', '低頻感強'] },
  { id: 't25', title: '休止符', categoryId: 'guard', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻心跳般的節奏，讓你不再感覺心跳是干擾。', suitableFor: '半夜容易被細微聲音驚醒', effect: '減少夜醒次數，維持睡眠深度', tags: ['純噪音', '整夜守護', '低頻感強'] },
  { id: 't26', title: '呼吸準線', categoryId: 'guard', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', oneLiner: '有呼吸節奏的環境音，讓你的呼吸自動放慢下來。', suitableFor: '清晨容易提早醒來', effect: '整夜提供穩定的聽覺覆蓋', tags: ['無歌詞', '整夜守護', '慢節奏（60–80 BPM）'] },
  { id: 't27', title: '安靜夜海', categoryId: 'guard', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻海浪聲，像在夜裡替你守住每一個翻來覆去的瞬間。', suitableFor: '習慣有機器運轉聲才能安心的人', effect: '減少夜醒次數，維持睡眠深度', tags: ['環境音', '整夜守護', '低頻感強'] },
  { id: 't28', title: '黑夜呼吸毯', categoryId: 'guard', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800', oneLiner: '柔和的毯狀氛圍音，像輕柔地覆蓋在你身上。', suitableFor: '清晨容易提早醒來', effect: '整夜提供穩定的聽覺覆蓋', tags: ['無歌詞', '整夜守護', '低頻感強'] },
  { id: 't29', title: '深夜節律', categoryId: 'guard', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800', oneLiner: '有規律、不變、穩定的低頻背景，讓你在夜裡不再浮動。', suitableFor: '半夜容易被細微聲音驚醒', effect: '減少夜醒次數，維持睡眠深度', tags: ['純噪音', '整夜守護', '慢節奏'] },
  { id: 't30', title: '守夜陪伴', categoryId: 'guard', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=800', oneLiner: '一整晚陪伴的噪音聲，像有一個「背景守護者」在旁邊。', suitableFor: '清晨容易提早醒來', effect: '整夜提供穩定的聽覺覆蓋', tags: ['純噪音', '整夜守護', '整夜可播放'] },

  // 身體放鬆 (Hormonal)
  { id: 't31', title: '溫柔潮汐', categoryId: 'relax', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&q=80&w=800', oneLiner: '海浪與柔暖音色，讓體溫波動也被安靜撫平。', suitableFor: '感覺身體緊繃、燥熱或不安', effect: '幫助肌肉放鬆，轉移身體注意力', tags: ['環境音', '身體放鬆', '柔和高頻'] },
  { id: 't32', title: '森林夜眠', categoryId: 'relax', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800', oneLiner: '森林夜晚的蟲鳴與風聲，像在一個安靜森林裡睡著。', suitableFor: '生理期或身體不適時', effect: '營造舒緩無壓力的空間感', tags: ['環境音', '身體放鬆', '低頻感強'] },
  { id: 't33', title: '月光晚安', categoryId: 'relax', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=800', oneLiner: '溫暖的 pads 與大提琴，像在月光下說一聲晚安。', suitableFor: '需要深層放鬆引導', effect: '與身體共鳴，緩解緊繃感', tags: ['有旋律', '身體放鬆', '柔和高頻'] },
  { id: 't34', title: '抱著身體', categoryId: 'relax', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻合成與弦樂，像擁抱自己，讓不適感慢慢退去。', suitableFor: '感覺身體緊繃、燥熱或不安', effect: '營造舒緩無壓力的空間感', tags: ['有旋律', '身體放鬆', '低頻感強'] },
  { id: 't35', title: '清涼午夜', categoryId: 'relax', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800', oneLiner: '水般清透的 pad 音，像在燥熱體感裡降下一點涼意。', suitableFor: '生理期或身體不適時', effect: '與身體共鳴，緩解緊繃感', tags: ['無歌詞', '身體放鬆', '柔和高頻'] },
  { id: 't36', title: '溫度節奏', categoryId: 'relax', duration: 6, imageUrl: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800', oneLiner: '有溫度感的低頻脈動，像在夜裡調節身體的熱與冷。', suitableFor: '需要深層放鬆引導', effect: '幫助肌肉放鬆，轉移身體注意力', tags: ['無歌詞', '身體放鬆', '低頻感強'] },
  { id: 't37', title: '深夜舒展', categoryId: 'relax', duration: 8, imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=800', oneLiner: '低頻環境音，幫助你在身體不適中尋找一絲舒展感。', suitableFor: '感覺身體緊繃、燥熱或不安', effect: '營造舒緩無壓力的空間感', tags: ['無歌詞', '身體放鬆', '低頻感強'] },
  { id: 't38', title: '夜裡的安全部位', categoryId: 'relax', duration: 4, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', oneLiner: '像隱藏在夜裡的安全部位，用低頻聲響包覆你。', suitableFor: '生理期或身體不適時', effect: '與身體共鳴，緩解緊繃感', tags: ['無歌詞', '身體放鬆', '低頻感強'] },
  { id: 't39', title: '溫柔潮汐', categoryId: 'relax', duration: 5, imageUrl: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&q=80&w=800', oneLiner: '海浪與低頻 pad，像在潮汐中慢慢放鬆入睡。', suitableFor: '感覺身體緊繃、燥熱或不安', effect: '幫助肌肉放鬆，轉移身體注意力', tags: ['環境音', '身體放鬆', '柔和高頻'] },
  { id: 't40', title: '深夜允諾', categoryId: 'relax', duration: 7, imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', oneLiner: '重複的舒緩 pad 和聲，像夜晚對你說：「你可以安心睡了。」', suitableFor: '需要深層放鬆引導', effect: '營造舒緩無壓力的空間感', tags: ['有旋律', '身體放鬆', '整夜可播放'] },

  // 新增的真實播放清單 (由 Suno 生成)
  { id: 't41', title: 'Moss Room', categoryId: 'calm', duration: 4, imageUrl: 'https://cdn2.suno.ai/image_large_6fab887c-46f9-4ddd-b711-0ac38e7010f1.jpeg', oneLiner: '清透冷靜的旋律，讓過度活躍的大腦稍作喘息。', suitableFor: '躺著還在想今天發生的事', effect: '可能幫助思緒沉澱，緩慢進入放鬆狀態', tags: ['放鬆大腦', 'Suno 音樂'], audioUrl: 'https://cdn1.suno.ai/6fab887c-46f9-4ddd-b711-0ac38e7010f1.mp3' },
  { id: 't42', title: 'Pine Moon Drift', categoryId: 'routine', duration: 4, imageUrl: 'https://cdn2.suno.ai/image_large_bb56e81c-217f-41fd-a450-0fac1ab89968.jpeg', oneLiner: '穩定的松林月夜節奏，逐漸接管你的專注力。', suitableFor: '作息紊亂，需要睡前儀式感', effect: '建立「該睡覺了」的制約反應', tags: ['固定作息', 'Suno 音樂'], audioUrl: 'https://cdn1.suno.ai/bb56e81c-217f-41fd-a450-0fac1ab89968.mp3' },
  { id: 't43', title: 'Night Drift Blanket', categoryId: 'guard', duration: 4, imageUrl: 'https://cdn2.suno.ai/image_large_758a8817-bc91-4be3-940b-e422ca3e4912.jpeg', oneLiner: '如毛毯般包裹的厚實頻率，在夜裡守護你。', suitableFor: '半夜容易被細微聲音驚醒', effect: '減少夜醒次數，維持睡眠深度', tags: ['整夜守護', 'Suno 音樂'], audioUrl: 'https://cdn1.suno.ai/758a8817-bc91-4be3-940b-e422ca3e4912.mp3' },
  { id: 't44', title: 'Night Drift Blanket 2', categoryId: 'relax', duration: 4, imageUrl: 'https://cdn2.suno.ai/image_large_7ae55164-c6f1-4cf3-97d0-01ade4951455.jpeg', oneLiner: '更深層的溫柔包裹，為生理與心理帶來放鬆。', suitableFor: '感覺身體緊繃、燥熱或不安', effect: '幫助肌肉放鬆，轉移身體注意力', tags: ['身體放鬆', 'Suno 音樂'], audioUrl: 'https://cdn1.suno.ai/7ae55164-c6f1-4cf3-97d0-01ade4951455.mp3' }
];

module.exports = { PROBLEMS, CATEGORIES, TRACKS };
