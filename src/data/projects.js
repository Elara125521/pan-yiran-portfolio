// Content transcribed from docs/content.md. The SHUNSHI link listed under
// SANSHAN points to 顺时 and is assigned to that project pending confirmation.
export const projects = [
  { id: 'shunshi', name: '顺时', english: 'SHUNSHI', category: 'UI/UX设计', description: '一款结合二十四节气文化的情绪疗愈应用，通过自然化交互帮助用户记录和探索自己的情绪。', introduction: '顺时是一款面向年轻用户的情绪疗愈应用。项目通过二十四节气文化、自然意象以及轻量化记录方式，帮助用户建立与自身情绪的长期连接。', highlights: ['情绪记录体验', 'AI辅助表达', '自然化视觉语言', 'iOS交互设计'], tools: ['Figma', 'After Effects'], image: 'phone.png', linkLabel: 'Prototype', url: 'https://www.figma.com/proto/3SZkgzjJqAorFCCvTFYxtf/%E9%A1%BA%E6%97%B6APP?node-id=0-1&t=DqQXBg50iedJrZT3-1' },
  { id: 'sanshan', name: '三山来了', english: 'Sanshan Coming', category: 'UX/UI设计 · 体验设计 · 文化IP', description: '一个连接地方文化、线下体验与数字探索的文旅体验应用。', introduction: '基于张家界大庸古城真实文旅项目，探索如何通过数字产品连接游客、文化内容以及线下商业体验。', highlights: ['文旅体验设计', '数字导览', 'IP内容转化', '线下服务连接'], tools: ['Figma'], image: 'phone.png', linkLabel: 'Prototype', url: 'https://www.figma.com/proto/CmP2GZaMB5AkmXpeHkYiM2/%E2%80%9C%E4%B8%89%E5%B1%B1%E6%9D%A5%E4%BA%86%E2%80%9D%E6%95%B0%E5%AD%97APP?node-id=0-1&t=DPeIqwWl7ED4BmRv-1' },
  { id: 'yugeng', name: '禹耕乡野', english: 'YU TILL THE FIELD', category: '产品设计 · 品牌数字化延展', description: '从乡村文旅品牌延伸出的数字体验小程序。', introduction: '基于乡村文化调研，将品牌视觉、旅游体验以及数字服务结合，构建现代东方乡村体验。', highlights: ['小程序设计', '文旅体验', '品牌数字化延展'], tools: ['Figma'], image: 'phone.png', linkLabel: 'Mini Program' },
  { id: 'eat', name: '一起吃', english: 'Eat together', category: 'UX 再设计 · 交互 · Vibe Coding', description: '一个帮助多人快速完成餐饮选择的轻量化体验。', introduction: '针对多人聚餐时选择困难的问题，设计更加快速、有趣的共同决策体验。', highlights: ['用户决策流程优化', '推荐机制设计', '移动端交互'], tools: ['Figma', 'Vibe Coding'], image: 'phone.png', linkLabel: 'Demo', url: 'https://eat-together-meituan.netlify.app/' },
  { id: 'muse', name: 'MUSE 创意素材工作台', english: '', category: '网页设计 · 设计系统', description: '探索创意工具与数字体验结合的实验项目。', introduction: '一个探索创意工作流程与数字交互可能性的实验项目。', highlights: ['创意工具', '数字体验'], tools: ['Figma'], image: 'web.png', linkLabel: 'Prototype' },
  { id: 'experiments', name: '其它尝试', english: '', category: '视觉 / 动态 / 交互实验', description: '其他实验性设计探索。', introduction: '包含个人探索、视觉实验以及未来方向尝试。', highlights: ['视觉实验', '交互探索'], tools: [], linkLabel: '更多探索' },
];

// Explicit case-study manifests; populate after the final assets are supplied.
export const caseStudyImages = Object.fromEntries(projects.map(project => [project.id, []]));
