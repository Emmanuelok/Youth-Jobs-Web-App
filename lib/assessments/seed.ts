/**
 * Default assessment content the engine ships with.
 *
 * Two starter assessments — English-reading basics and customer-service
 * basics — chosen because they are universally useful, age-appropriate,
 * non-condescending, and Ghana-context-aware. Admins can author more via
 * the admin UI.
 *
 * Authoring notes:
 *   - Keep questions in plain English. The audience may have limited
 *     English confidence; the goal is to confirm comprehension, not to
 *     test vocabulary depth.
 *   - Multiple acceptable answers for short-text questions (capture
 *     common spellings and synonyms).
 *   - Explanations should teach, not scold.
 *   - When in doubt, err on the side of the candidate.
 */

export type SeedQuestion = {
  prompt: string;
  questionType: "multiple_choice" | "true_false" | "short_text_match";
  options?: { id: string; text: string }[];
  correctAnswers: string[];
  explanation?: string;
  points?: number;
};

export type SeedAssessment = {
  skillSlug: string;
  skillName: string;
  skillCategory: string;
  skillDescription: string;
  title: string;
  introText: string;
  passingScore: number;
  questions: SeedQuestion[];
};

export const SEED_ASSESSMENTS: SeedAssessment[] = [
  {
    skillSlug: "english_basics",
    skillName: "Basic English reading",
    skillCategory: "literacy",
    skillDescription:
      "Reads short signs, messages, and instructions in English at a basic level.",
    title: "Basic English reading",
    introText:
      "Eight short questions about reading simple English sentences and signs. Take your time — there is no clock.",
    passingScore: 70,
    questions: [
      {
        prompt:
          'A shop sign says "OPEN 8am to 6pm". The shop closes at what time?',
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "8am" },
          { id: "b", text: "6am" },
          { id: "c", text: "6pm" },
          { id: "d", text: "8pm" },
        ],
        correctAnswers: ["c"],
        explanation: 'The sign means it opens at 8am and closes at 6pm.',
      },
      {
        prompt:
          'A poster says "FREE training for young women aged 16-22". Who is this for?',
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Young women aged 16 to 22" },
          { id: "b", text: "Anyone under 30" },
          { id: "c", text: "Only women over 25" },
          { id: "d", text: "Only men aged 16 to 22" },
        ],
        correctAnswers: ["a"],
      },
      {
        prompt:
          'A message says "Bring your ID card to the interview". What do you need to bring?',
        questionType: "short_text_match",
        correctAnswers: ["id card", "id", "ghana card", "identity card"],
        explanation:
          "An ID card — usually your Ghana Card or another government identity card.",
      },
      {
        prompt: 'True or false: "Walk-ins welcome" means you need an appointment.',
        questionType: "true_false",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswers: ["false"],
        explanation:
          '"Walk-ins welcome" means you can visit without an appointment.',
      },
      {
        prompt:
          'An ad says "Salary negotiable". This means the salary is:',
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Fixed and cannot change" },
          { id: "b", text: "Open to discussion between employer and worker" },
          { id: "c", text: "Always very high" },
          { id: "d", text: "Always very low" },
        ],
        correctAnswers: ["b"],
      },
      {
        prompt:
          'A safety notice says "Wear closed shoes in the workshop at all times". Open sandals are:',
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Allowed" },
          { id: "b", text: "Not allowed" },
          { id: "c", text: "Allowed on weekends only" },
          { id: "d", text: "Allowed only for visitors" },
        ],
        correctAnswers: ["b"],
      },
      {
        prompt:
          'An employer writes: "Reply by Friday 5pm". By when must you reply?',
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Friday morning" },
          { id: "b", text: "Friday at 5pm or earlier" },
          { id: "c", text: "Saturday" },
          { id: "d", text: "Whenever you want" },
        ],
        correctAnswers: ["b"],
      },
      {
        prompt:
          'True or false: A job description that says "no experience needed" still requires you to have worked there before.',
        questionType: "true_false",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswers: ["false"],
        explanation:
          '"No experience needed" means the employer is willing to train you on the job.',
      },
    ],
  },
  {
    skillSlug: "customer_service",
    skillName: "Customer service basics",
    skillCategory: "soft",
    skillDescription:
      "Understands how to greet, listen, and respond to customers respectfully.",
    title: "Customer service basics",
    introText:
      "Six short questions about how to treat customers well in a shop, salon, or kitchen. Most of these are common sense — trust yourself.",
    passingScore: 70,
    questions: [
      {
        prompt:
          "A customer enters the shop. What should you do first?",
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Ignore them and keep working" },
          { id: "b", text: "Greet them politely and ask how you can help" },
          { id: "c", text: "Wait until they call you" },
          { id: "d", text: "Tell them to come back later" },
        ],
        correctAnswers: ["b"],
      },
      {
        prompt:
          "A customer complains the food is cold. The best first step is to:",
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Argue with them" },
          { id: "b", text: "Apologise and offer to fix it" },
          { id: "c", text: "Walk away" },
          { id: "d", text: "Charge extra for a fresh one" },
        ],
        correctAnswers: ["b"],
      },
      {
        prompt:
          "True or false: It's OK to use your phone while serving a customer.",
        questionType: "true_false",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswers: ["false"],
        explanation:
          "Give the customer your full attention. Phone calls can wait.",
      },
      {
        prompt:
          "A customer asks a question and you don't know the answer. The best response is:",
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Guess and hope you're right" },
          { id: "b", text: "Say \"I don't know\" and walk away" },
          { id: "c", text: "Say you'll check, then ask your supervisor or check yourself" },
          { id: "d", text: "Tell the customer to find out themselves" },
        ],
        correctAnswers: ["c"],
      },
      {
        prompt:
          "True or false: A customer who looks young can be ignored because they probably can't buy anything.",
        questionType: "true_false",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswers: ["false"],
        explanation:
          "Treat every customer with respect, regardless of age or appearance.",
      },
      {
        prompt:
          "End-of-day. You're tired and one customer comes in just before closing. What do you do?",
        questionType: "multiple_choice",
        options: [
          { id: "a", text: "Tell them you're closed even though you're still open" },
          { id: "b", text: "Serve them politely as you would any other customer" },
          { id: "c", text: "Rush them so you can leave" },
          { id: "d", text: "Ignore them" },
        ],
        correctAnswers: ["b"],
      },
    ],
  },
];
