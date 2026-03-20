import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function chatWithAI(messages, apiKey) {
  if (!apiKey) throw new Error('OpenAI API кілті орнатылмаған. Баптаулардан кілтті енгізіңіз.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI қатесі: ${res.status}`);
  }
  return data.choices[0].message.content;
}

export async function extractTextFromPDF(url) {
  const pdf = await pdfjsLib.getDocument(url).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

export async function generateTest(pdfUrl, numQuestions, apiKey) {
  const text = await extractTextFromPDF(pdfUrl);
  if (text.length < 50) throw new Error('PDF файлынан мәтін алу мүмкін болмады.');

  const trimmed = text.substring(0, 8000);
  const prompt = `Сен оқытушының көмекшісісің. Берілген лекция мәтіні бойынша ${numQuestions} тест сұрағын жаса.

Лекция мәтіні:
"""
${trimmed}
"""

Жауапты тек JSON форматында бер, басқа мәтін жазба:
[
  {
    "q": "Сұрақ мәтіні",
    "opts": ["Нұсқа A", "Нұсқа B", "Нұсқа C", "Нұсқа D"],
    "answer": 0
  }
]

Ережелер:
- Әр сұрақта 4 нұсқа болсын
- "answer" — дұрыс жауаптың индексі (0-3)
- Сұрақтар лекция мазмұнына негізделсін
- Сұрақтар қазақ тілінде болсын
- Тек JSON қайтар, басқа мәтін жазба`;

  const response = await chatWithAI([{ role: 'user', content: prompt }], apiKey);
  const match = response.match(/\[[\s\S]*\]/);
  const json = match ? match[0] : response;

  try {
    const questions = JSON.parse(json);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Бос');
    return questions.map((q) => ({
      q: q.q,
      opts: q.opts.slice(0, 4),
      answer: typeof q.answer === 'number' ? q.answer : 0,
    }));
  } catch {
    throw new Error('ИИ жауабын өңдеу мүмкін болмады. Қайталап көріңіз.');
  }
}

export async function explainAnswer(question, userAnswer, correctAnswer, apiKey) {
  const prompt = `Студент тест тапсырып жатыр. Ол қате жауап берді. Оған неліктен жауабы қате екенін және дұрыс жауапты түсіндір.

Сұрақ: ${question.q}
Нұсқалар: ${question.opts.map((o, i) => `${i + 1}) ${o}`).join(', ')}
Студенттің жауабы: ${userAnswer + 1} (${question.opts[userAnswer]})
Дұрыс жауап: ${correctAnswer + 1} (${question.opts[correctAnswer]})

Қысқа және түсінікті түсіндір (3-5 сөйлем). Қазақ тілінде жаз.`;

  return await chatWithAI([{ role: 'user', content: prompt }], apiKey);
}
