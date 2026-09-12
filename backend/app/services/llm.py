"""
LLM provider abstraction. Swapping Gemini <-> OpenAI is a matter of
changing LLM_PROVIDER in .env -- no other code changes needed, because
every provider implements the same function signatures.

Three distinct LLM-backed capabilities (advanced feature #3):
  1. generate_quiz_questions   -- assessment generation (multilingual)
  2. tag_competencies          -- zero-shot classification of uploaded
                                   material against the FRAC competency
                                   list, so any document (not just
                                   pre-linked modules) can drive a real
                                   competency score update
  3. explain_recommendation    -- a one-line, learner-specific rationale
                                   for why a module was recommended
"""
import json
import os
import re

from app.core.config import settings

LANGUAGE_NAMES = {"en": "English", "hi": "Hindi"}

QUIZ_PROMPT_TEMPLATE = """You are an assessment designer for India's Official Statistical System training program.

Based ONLY on the following source material, generate exactly {n} multiple-choice questions
that test genuine understanding across a balanced range of difficulty levels.
Write the entire quiz (questions, options, explanations) in {language}.

Requirement: Each question MUST have a "difficulty" field as an INTEGER from 1 to 5:
- 1: Basic recall / definition
- 2: Elementary application
- 3: Standard conceptual comprehension (benchmark level)
- 4: Complex multi-step reasoning
- 5: Advanced synthesis / edge-case analysis
Generate a balanced pool with at least 2 questions per difficulty level (1 through 5).

Return ONLY valid JSON (no markdown fences, no commentary) in this exact schema:
[
  {{
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correct_index": 0,
    "explanation": "1-2 sentence explanation of why this answer is correct",
    "difficulty": 1
  }}
]

Source material:
---
{content}
---
"""

TAG_PROMPT_TEMPLATE = """You are classifying training material against a government competency framework (FRAC).

Here is the list of valid competencies:
{competency_list}

Based on the material below, return ONLY a JSON array of the competency names from
the list above that this material genuinely helps develop (0 to 5 names, most relevant first).
Do not invent competency names outside this list.

Material:
---
{content}
---
"""

RATIONALE_PROMPT_TEMPLATE = """A government learner has a competency gap: "{competency_name}"
(a {competency_type} competency, currently at level {current_level:.1f} of {required_level} required).

The recommended training module is: "{module_title}" -- {module_description}

Write ONE short, specific sentence (max 25 words) explaining why this module addresses
their gap. Plain language, no fluff, no greeting. Return only the sentence.
"""


def _extract_json(text: str):
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()
    else:
        start_bracket = text.find("[")
        start_brace = text.find("{")
        if start_bracket != -1 and (start_brace == -1 or start_bracket < start_brace):
            end = text.rfind("]")
            if end != -1:
                text = text[start_bracket : end + 1]
        elif start_brace != -1:
            end = text.rfind("}")
            if end != -1:
                text = text[start_brace : end + 1]
    return json.loads(text.strip())


def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai

    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set. Add it to backend/.env")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    models_to_try = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"]
    last_err = None
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            if resp and resp.text:
                return resp.text
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini model generation failed across all candidate models.")


def _call_openai(prompt: str) -> str:
    from openai import OpenAI

    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set. Add it to backend/.env")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )
    return resp.choices[0].message.content


def _call_groq_raw(prompt: str) -> str:
    from groq import Groq

    groq_api_key = getattr(settings, "GROQ_API_KEY", None) or os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY not set. Add it to backend/.env")

    client = Groq(api_key=groq_api_key)
    models_to_try = ["llama-3.3-70b-versatile", "groq/compound", "qwen/qwen3.8-27b"]
    last_err = None
    for model_name in models_to_try:
        try:
            chat_completion = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            return chat_completion.choices[0].message.content or ""
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Groq model generation failed across candidate models.")


def _call_groq(prompt: str) -> dict:
    raw = _call_groq_raw(prompt)
    return _extract_json(raw)


def _call_llm(prompt: str) -> str:
    provider = settings.LLM_PROVIDER.lower() if settings.LLM_PROVIDER else "gemini"
    if provider == "openai":
        return _call_openai(prompt)

    # Provider chain: Gemini -> Groq
    try:
        text = _call_gemini(prompt)
        if text and text.strip():
            print("[LLM Provider] Served by Gemini")
            return text
        print("[LLM Provider] Gemini returned empty response, falling through to Groq...")
    except Exception as e:
        print(f"[LLM Provider] Gemini failed ({e}), falling through to Groq...")

    try:
        text = _call_groq_raw(prompt)
        if text and text.strip():
            print("[LLM Provider] Served by Groq (llama-3.3-70b-versatile)")
            return text
        print("[LLM Provider] Groq returned empty response.")
    except Exception as e:
        print(f"[LLM Provider] Groq failed ({e})")

    raise RuntimeError("All configured LLM providers (Gemini, Groq) failed.")


def _normalize_difficulty(val) -> int:
    """Normalize any difficulty value to an integer 1-5 (Computerized Adaptive Testing scale)."""
    if isinstance(val, int):
        return min(max(val, 1), 5)
    if isinstance(val, (float, str)):
        val_str = str(val).strip().lower()
        if "1" in val_str or "easy" in val_str or "beginner" in val_str:
            return 1
        if "2" in val_str or "basic" in val_str:
            return 2
        if "3" in val_str or "medium" in val_str or "intermediate" in val_str:
            return 3
        if "4" in val_str or "advanced" in val_str:
            return 4
        if "5" in val_str or "hard" in val_str or "expert" in val_str:
            return 5
        try:
            return min(max(int(float(val_str)), 1), 5)
        except Exception:
            pass
    return 3


def _generate_fallback_questions(content: str, n: int = 5, language: str = "en") -> list[dict]:
    """
    Resilient domain-aware fallback generator with balanced difficulty levels 1 through 5
    (at least 2 questions per level) for seamless Computerized Adaptive Testing.
    """
    content_lower = content.lower()
    is_hindi = language == "hi"
    
    if "grammar" in content_lower or "english" in content_lower or "sentence" in content_lower or "noun" in content_lower:
        base_pool = [
            # Difficulty 1 (Recall / Definition)
            {
                "question": "व्याकरण में संज्ञा (Noun) का प्राथमिक कार्य क्या है?" if is_hindi else "In foundational grammar, what is the primary grammatical function of a noun?",
                "options": [
                    "किसी व्यक्ति, स्थान या वस्तु का नामकरण करना" if is_hindi else "To name a person, place, thing, or concept",
                    "क्रिया की विशेषता बताना" if is_hindi else "To describe an action or state of occurrence",
                    "दो वाक्यों को जोड़ना" if is_hindi else "To connect subordinate clauses together",
                    "भावना व्यक्त करना" if is_hindi else "To express an abrupt exclamation"
                ],
                "correct_index": 0,
                "explanation": "संज्ञा का उपयोग किसी व्यक्ति, स्थान या वस्तु को संदर्भित करने के लिए किया जाता है।" if is_hindi else "A noun functions as the naming word for any entity, person, place, thing, or abstract idea.",
                "difficulty": 1
            },
            {
                "question": "सर्वनाम (Pronoun) का प्राथमिक उद्देश्य क्या है?" if is_hindi else "What is the primary function of a pronoun in standard English syntax?",
                "options": [
                    "संज्ञा की पुनरावृत्ति से बचना और उसका स्थान लेना" if is_hindi else "To replace a noun phrase and prevent unnecessary repetition",
                    "क्रिया के काल को बदलना" if is_hindi else "To alter the tense of the principal verb",
                    "संज्ञा की मात्रा मापना" if is_hindi else "To quantify adjectives within dependent clauses",
                    "वाक्य को समाप्त करना" if is_hindi else "To conclude an exclamatory sentence"
                ],
                "correct_index": 0,
                "explanation": "सर्वनाम संज्ञा के स्थान पर प्रयुक्त होकर वाक्य प्रवाह को सुगम बनाते हैं।" if is_hindi else "Pronouns replace nouns to avoid awkward repetition across sentences.",
                "difficulty": 1
            },
            # Difficulty 2 (Elementary Application)
            {
                "question": "वाक्य में विशेषण (Adjective) का क्या उद्देश्य है?" if is_hindi else "What is the key role of an adjective in sentence construction?",
                "options": [
                    "संज्ञा या सर्वनाम की विशेषता बताना और संशोधन करना" if is_hindi else "To modify or provide descriptive detail about a noun or pronoun",
                    "समय और काल का निर्धारण करना" if is_hindi else "To denote the temporal sequence of auxiliary clauses",
                    "मुख्य क्रिया का स्थान लेना" if is_hindi else "To replace coordinating prepositions",
                    "विराम चिह्न लगाना" if is_hindi else "To terminate an interrogative clause"
                ],
                "correct_index": 0,
                "explanation": "विशेषण संज्ञा के गुण, स्थिति या संख्या को स्पष्ट करते हैं।" if is_hindi else "Adjectives clarify attributes, qualities, quantities, or specific identities of nouns.",
                "difficulty": 2
            },
            {
                "question": "क्रियाविशेषण (Adverb) सामान्यतः किसे संशोधित करता है?" if is_hindi else "Which sentence constituent does an adverb typically modify?",
                "options": [
                    "क्रिया, विशेषण या अन्य क्रियाविशेषण" if is_hindi else "A verb, an adjective, or another adverb",
                    "केवल उचित संज्ञा" if is_hindi else "Proper nouns exclusively",
                    "संबोधन अव्यय" if is_hindi else "Interjections only",
                    "अनुच्छेद का शीर्षक" if is_hindi else "Paragraph headings"
                ],
                "correct_index": 0,
                "explanation": "क्रियाविशेषण क्रिया की रीति, समय या स्थान को व्यक्त करते हैं।" if is_hindi else "Adverbs modify verbs, adjectives, or other adverbs indicating manner, time, or degree.",
                "difficulty": 2
            },
            # Difficulty 3 (Conceptual Comprehension)
            {
                "question": "सकर्मक क्रिया (Transitive Verb) और अकर्मक क्रिया में क्या मुख्य अंतर है?" if is_hindi else "What distinguishes a transitive verb from an intransitive verb in standard sentence structure?",
                "options": [
                    "सकर्मक क्रिया को सीधे कर्म (Direct Object) की आवश्यकता होती है" if is_hindi else "A transitive verb requires a direct object to receive the action",
                    "सकर्मक क्रिया केवल भूतकाल में प्रयुक्त होती है" if is_hindi else "A transitive verb can never take any tense form",
                    "सकर्मक क्रिया का कोई कर्ता नहीं होता" if is_hindi else "A transitive verb modifies adjectives exclusively",
                    "इनमें कोई अंतर नहीं है" if is_hindi else "An intransitive verb requires two objects"
                ],
                "correct_index": 0,
                "explanation": "सकर्मक क्रिया अपने कार्य को पूरा करने के लिए एक कर्म की अपेक्षा करती है।" if is_hindi else "Transitive verbs demand a direct object to express a complete conceptual thought in standard grammar.",
                "difficulty": 3
            },
            {
                "question": "पूर्वसर्ग (Preposition) का संबंध किससे दर्शाया जाता है?" if is_hindi else "Which grammatical relationship is established by a preposition in a clause?",
                "options": [
                    "संज्ञा या सर्वनाम का वाक्य के अन्य शब्दों से संबंध" if is_hindi else "Spatial, temporal, or logical relationship between a noun and other words",
                    "क्रिया का विलोम शब्द" if is_hindi else "The tense conjugation of irregular verbs",
                    "केवल विषय का शीर्षक" if is_hindi else "The rhyming scheme of dependent predicates",
                    "वाक्य की लंबाई बढ़ाना" if is_hindi else "The capitalisation rules for proper nouns"
                ],
                "correct_index": 0,
                "explanation": "पूर्वसर्ग स्थान, समय या दिशा को वाक्य के अन्य अंगों से जोड़ते हैं।" if is_hindi else "Prepositions indicate temporal sequences, locations, and directions relative to other sentence elements.",
                "difficulty": 3
            },
            # Difficulty 4 (Complex Reasoning)
            {
                "question": "विषय-क्रिया समझौता (Subject-Verb Agreement) का मूल नियम क्या है?" if is_hindi else "What is the core principle of Subject-Verb Agreement in formal writing?",
                "options": [
                    "एकवचन कर्ता के साथ एकवचन क्रिया और बहुवचन के साथ बहुवचन क्रिया" if is_hindi else "Singular subjects require singular verbs, and plural subjects require plural verbs",
                    "कर्ता और क्रिया में कोई संबंध नहीं होना चाहिए" if is_hindi else "Verbs must always remain in base infinitive form regardless of subject",
                    "क्रिया हमेशा भूतकाल में होनी चाहिए" if is_hindi else "Subject number is determined by the object pronoun",
                    "कर्ता हमेशा वाक्य के अंत में आता है" if is_hindi else "Agreement is only mandatory in passive voice constructions"
                ],
                "correct_index": 0,
                "explanation": "कर्ता और क्रिया का वचन परस्पर संगत होना अनिवार्य है।" if is_hindi else "The grammatical number of the subject dictates the morphological form of the principal verb.",
                "difficulty": 4
            },
            {
                "question": "संयुक्त वाक्य (Compound Sentence) और जटिल वाक्य (Complex Sentence) में संरचनात्मक अंतर क्या है?" if is_hindi else "What is the structural distinction between a compound sentence and a complex sentence?",
                "options": [
                    "संयुक्त वाक्य में दो स्वतंत्र उपवाक्य होते हैं, जबकि जटिल वाक्य में कम से कम एक आश्रित उपवाक्य होता है" if is_hindi else "A compound sentence joins independent clauses; a complex sentence contains at least one dependent clause",
                    "संयुक्त वाक्य हमेशा छोटा होता है" if is_hindi else "Compound sentences never utilize coordinating conjunctions",
                    "जटिल वाक्य में क्रिया नहीं होती" if is_hindi else "Complex sentences cannot contain subordinate clauses",
                    "दोनों में कोई अंतर नहीं है" if is_hindi else "Both forms are strictly interchangeable in academic writing"
                ],
                "correct_index": 0,
                "explanation": "स्वतंत्र और आश्रित उपवाक्यों का संयोजन ही संरचना को परिभाषित करता है।" if is_hindi else "Subordination distinguishes complex clauses from coordinate structures.",
                "difficulty": 4
            },
            # Difficulty 5 (Advanced Synthesis)
            {
                "question": "सबजंक्टिव मूड (Subjunctive Mood) का उपयोग कब अनिवार्य होता है?" if is_hindi else "When is the English subjunctive mood appropriately invoked in formal drafting?",
                "options": [
                    "काल्पनिक, इच्छा या औपचारिक मांग/शर्त व्यक्त करने के लिए" if is_hindi else "To express hypothetical scenarios, unreal conditions, or formal mandates and resolutions",
                    "नियमित दैनिक दिनचर्या बताने के लिए" if is_hindi else "To describe habitual, repetitive daily actions in present tense",
                    "भविष्य की सामान्य घटनाओं के लिए" if is_hindi else "To announce definitive chronological facts in the past tense",
                    "केवल प्रश्न पूछने के लिए" if is_hindi else "Exclusively when constructing passive interrogative sentences"
                ],
                "correct_index": 0,
                "explanation": "सबजंक्टिव मूड अवास्तविक या औपचारिक अनिवार्यताओं को दर्शाता है।" if is_hindi else "The subjunctive mood conveys counter-factual hypotheses, wishes, or imperative resolutions.",
                "difficulty": 5
            },
            {
                "question": "हैंगिंग पार्टिसिपल (Dangling Modifier) वाक्य में क्या दोष उत्पन्न करता है?" if is_hindi else "What semantic ambiguity arises when a dangling modifier is introduced into official correspondence?",
                "options": [
                    "संशोधक उस कर्ता से विमुख हो जाता है जिसे उसे संशोधित करना चाहिए" if is_hindi else "The modifying participle lacks a logically clear subject, misattributing the intended action",
                    "वाक्य में वर्तनी की त्रुटि होती है" if is_hindi else "It introduces orthographic and spelling violations into nominal forms",
                    "क्रिया का काल बदल जाता है" if is_hindi else "It forces the entire predicate into the future perfect tense",
                    "यह कोई दोष नहीं है" if is_hindi else "It is an approved stylistic convention in legislative statutory drafting"
                ],
                "correct_index": 0,
                "explanation": "संशोधक का तार्किक कर्ता वाक्य में स्पष्ट होना अनिवार्य है।" if is_hindi else "Modifiers must clearly attach to the agent executing the verbal action.",
                "difficulty": 5
            }
        ]
    else:
        base_pool = [
            # Difficulty 1
            {
                "question": "सर्वेक्षण प्रश्नावली डिजाइन करते समय किस सिद्धांत का पालन अनिवार्य है?" if is_hindi else "Which foundational design principle is critical when administering structured survey questionnaires?",
                "options": [
                    "स्पष्ट, गैर-पक्षपातपूर्ण और सुबोध भाषा का उपयोग" if is_hindi else "Unambiguous, neutral, and objectively formulated phrasing to prevent response bias",
                    "अत्यधिक जटिल तकनीकी शब्दों का प्रयोग" if is_hindi else "Embedding leading assumptions within interview prompts",
                    "उत्तरदाता को पहले से उत्तर सुझाना" if is_hindi else "Maximizing jargon to challenge respondent comprehension",
                    "प्रश्नों को यथासंभव लंबा बनाना" if is_hindi else "Omitting skip-patterns and validation prompts"
                ],
                "correct_index": 0,
                "explanation": "निष्पक्ष और स्पष्ट भाषा ही सटीक प्रतिक्रिया सुनिश्चित करती है।" if is_hindi else "Clear, neutral questioning prevents cognitive fatigue and systemic response bias.",
                "difficulty": 1
            },
            {
                "question": "केंद्रीय प्रवृत्ति (Central Tendency) का कौन सा माप अत्यधिक चरम मानों (Outliers) से सबसे कम प्रभावित होता है?" if is_hindi else "Which measure of central tendency is least sensitive to extreme outlying observations?",
                "options": [
                    "माध्यिका (Median)" if is_hindi else "Median",
                    "समांतर माध्य (Mean)" if is_hindi else "Arithmetic Mean",
                    "मानक विचलन (Standard Deviation)" if is_hindi else "Standard Deviation",
                    "प्रसरण (Variance)" if is_hindi else "Variance"
                ],
                "correct_index": 0,
                "explanation": "माध्यिका स्थितिगत औसत होने के कारण चरम मानों से अप्रभावित रहती है।" if is_hindi else "The median is robust against extreme outliers because it reflects positional rank.",
                "difficulty": 1
            },
            # Difficulty 2
            {
                "question": "डेटा सत्यापन (Data Validation) प्रक्रिया में प्रथम चरण क्या होना चाहिए?" if is_hindi else "What constitutes the foundational step in survey data validation pipelines?",
                "options": [
                    "संगति जांच और त्रुटि सीमा निर्धारण (Range & Consistency Checks)" if is_hindi else "Implementing systematic range, boundary, and logical consistency checks",
                    "तुरंत रिपोर्ट प्रकाशित करना" if is_hindi else "Directly publishing provisional estimates without verification",
                    "अपूर्ण प्रविष्टियों को बिना जांचे हटाना" if is_hindi else "Discarding all outlying values prior to exploratory analysis",
                    "केवल शीर्ष 10% डेटा का विश्लेषण करना" if is_hindi else "Relying exclusively on self-reported enumerator flags"
                ],
                "correct_index": 0,
                "explanation": "सीमा एवं संगति परीक्षण डेटा की विश्वसनीयता की प्रथम गारंटी है।" if is_hindi else "Automated range and logical checks immediately flag anomalies at ingestion.",
                "difficulty": 2
            },
            {
                "question": "प्रतिचयन त्रुटि (Sampling Error) को कम करने का सबसे सीधा उपाय क्या है?" if is_hindi else "What is the most direct operational method to reduce standard sampling error?",
                "options": [
                    "नमूना आकार (Sample Size) बढ़ाना" if is_hindi else "Increasing the sample size within budgetary constraints",
                    "सर्वेक्षण प्रश्नों को कम करना" if is_hindi else "Reducing questionnaire items to demographic questions only",
                    "केवल एक ही क्षेत्र का सर्वेक्षण करना" if is_hindi else "Confining fieldwork to homogeneous urban clusters",
                    "अनुमानित सांख्यिकी को छोड़ देना" if is_hindi else "Relying on convenience sampling methods"
                ],
                "correct_index": 0,
                "explanation": "बड़ा नमूना आकार मानक त्रुटि को $1/\sqrt{n}$ की दर से घटाता है।" if is_hindi else "Standard error is inversely proportional to the square root of sample size.",
                "difficulty": 2
            },
            # Difficulty 3
            {
                "question": "आधिकारिक सांख्यिकी प्रणाली में प्रतिचयन (Sampling) का मुख्य उद्देश्य क्या है?" if is_hindi else "What is the principal objective of scientific sampling in government surveys?",
                "options": [
                    "पूरी समष्टि (Population) का सटीक और लागत-कुशल अनुमान प्राप्त करना" if is_hindi else "Obtaining representative population estimates with quantifiable precision and cost efficiency",
                    "प्रत्येक नागरिक से अनिवार्य रूप से मिलना" if is_hindi else "Eliminating all non-sampling errors completely from the registry",
                    "सर्वेक्षण के डेटा को सीमित करना" if is_hindi else "Restricting survey scope to urban administrative centres only",
                    "केवल कागजी औपचारिकता पूरी करना" if is_hindi else "Replacing census operations permanently"
                ],
                "correct_index": 0,
                "explanation": "वैज्ञानिक प्रतिचयन समय और संसाधनों की बचत करते हुए सांख्यिकीय सटीकता सुनिश्चित करता है।" if is_hindi else "Scientific sampling optimizes operational resources while yielding statistically sound estimates.",
                "difficulty": 3
            },
            {
                "question": "मिशन कर्मयोगी के अनुसार सांख्यिकीय अधिकारियों के लिए नैतिक आचरण का क्या महत्व है?" if is_hindi else "Under the FRAC competency framework, why is integrity in official statistics vital?",
                "options": [
                    "सार्वजनिक विश्वास और नीति-निर्माण में डेटा की निष्पक्षता बनाए रखना" if is_hindi else "Upholding public trust, policy integrity, and absolute impartiality of governance indicators",
                    "केवल प्रशासनिक निरीक्षण से बचना" if is_hindi else "Avoiding procedural audit notices from supervisory bodies",
                    "अधिकारियों की पदोन्नति को तेज करना" if is_hindi else "Ensuring target survey completion quotas are met irrespective of quality",
                    "वार्षिक लक्ष्यों को कृत्रिम रूप से पूरा दिखाना" if is_hindi else "Limiting public scrutiny of administrative discrepancies"
                ],
                "correct_index": 0,
                "explanation": "डेटा की विश्वसनीयता से ही पारदर्शी एवं निष्पक्ष राष्ट्रीय नीतियां बनाई जाती हैं।" if is_hindi else "Sovereign policy depends completely on the verifiable credibility of public statistical indicators.",
                "difficulty": 3
            },
            # Difficulty 4
            {
                "question": "स्तरीकृत यादृच्छिक प्रतिचयन (Stratified Random Sampling) का प्रयोग कब किया जाता है?" if is_hindi else "When is Stratified Random Sampling preferred over Simple Random Sampling?",
                "options": [
                    "जब समष्टि में विभिन्न विषमांगी उप-समूह (Heterogeneous Subgroups) मौजूद हों" if is_hindi else "When the target population contains distinct, heterogeneous subgroups requiring proportional representation",
                    "जब समष्टि पूरी तरह समरूप (Homogeneous) हो" if is_hindi else "When the underlying population is entirely uniform and geographically isolated",
                    "जब कोई डेटा उपलब्ध न हो" if is_hindi else "When random number generators are unavailable to field staff",
                    "जब केवल एक ही व्यक्ति का सर्वेक्षण करना हो" if is_hindi else "When conducting unweighted rapid opinion polls"
                ],
                "correct_index": 0,
                "explanation": "स्तरीकरण प्रत्येक उप-समूह को सटीक प्रतिनिधित्व प्रदान करता है।" if is_hindi else "Stratification guarantees adequate representation of critical subgroups across diverse demographic strata.",
                "difficulty": 4
            },
            {
                "question": "गैर-प्रतिचयन त्रुटि (Non-Sampling Error) की प्रमुख विशेषता क्या है?" if is_hindi else "What characterizes non-sampling error in large-scale socio-economic surveys?",
                "options": [
                    "यह प्रतिदर्श आकार बढ़ने पर भी समाप्त नहीं होती (मापन, गैर-प्रतिक्रिया और प्रविष्टि त्रुटि)" if is_hindi else "It cannot be eliminated simply by increasing sample size, originating from measurement, non-response, and recording errors",
                    "यह केवल नमूना लेने के कारण होती है" if is_hindi else "It is solely attributable to random mathematical variance across replicates",
                    "यह शून्य होती है" if is_hindi else "It naturally converges to zero when stratified frames are adopted",
                    "इसे मापा नहीं जा सकता" if is_hindi else "It affects qualitative perception surveys only"
                ],
                "correct_index": 0,
                "explanation": "गैर-प्रतिचयन त्रुटि प्रक्रियात्मक और मानवीय कारकों से उत्पन्न होती है।" if is_hindi else "Non-sampling error arises from frame defects, non-response, and enumerator variance.",
                "difficulty": 4
            },
            # Difficulty 5
            {
                "question": "बहु-चरणीय क्लस्टर प्रतिचयन (Multi-Stage Cluster Sampling) में डिज़ाइन प्रभाव (Design Effect - DEFF) का सांख्यिकीय महत्व क्या है?" if is_hindi else "In multi-stage cluster sampling designs, what does the Design Effect (DEFF) quantify?",
                "options": [
                    "जटिल सर्वेक्षण अभिकल्प और सरल यादृच्छिक प्रतिचयन (SRS) के बीच प्रसरण का अनुपात" if is_hindi else "The ratio of variance under the complex design to the variance under simple random sampling of equivalent size",
                    "सर्वेक्षण दल की कुल यात्रा दूरी" if is_hindi else "The geographical travel radius required per supervisory field inspection cluster",
                    "प्रश्नावली पूरा करने में लगा औसत समय" if is_hindi else "The interview attrition rate attributable to questionnaire response burden",
                    "कंप्यूटर में डेटा अपलोड की गति" if is_hindi else "The algorithmic compression ratio of raw CAPI survey microdata tables"
                ],
                "correct_index": 0,
                "explanation": "DEFF क्लस्टरिंग के कारण प्रसरण में होने वाली वृद्धि को मापता है।" if is_hindi else "DEFF quantifies variance inflation due to intracluster correlation relative to SRS.",
                "difficulty": 5
            },
            {
                "question": "लघु क्षेत्र अनुमान (Small Area Estimation - SAE) में मिश्रित प्रभाव मॉडल (Mixed Effects Models) का मुख्य लाभ क्या है?" if is_hindi else "In Small Area Estimation (SAE), why are empirical best linear unbiased predictors (EBLUP) deployed?",
                "options": [
                    "सीमित प्रत्यक्ष प्रतिदर्श आकार वाले डोमेन के लिए सहायक प्रशासनिक डेटा से 'उधार शक्ति' प्राप्त करना" if is_hindi else "To borrow statistical strength from auxiliary administrative registers when domain sample size is sparse",
                    "प्रत्यक्ष सर्वेक्षण करने की आवश्यकता को पूरी तरह समाप्त करना" if is_hindi else "To eliminate all field enumeration costs and replace national surveys with web scrapers",
                    "सर्वेक्षण के डेटा को सार्वजनिक होने से छिपाना" if is_hindi else "To restrict microdata transparency under official secrecy protocols",
                    "केवल राष्ट्रीय स्तर के कुल योग की गणना करना" if is_hindi else "To compute unweighted national aggregates without sub-provincial disaggregation"
                ],
                "correct_index": 0,
                "explanation": "SAE सहायक डेटा के माध्यम से छोटे क्षेत्रों के विश्वसनीय अनुमान प्रस्तुत करता है।" if is_hindi else "SAE combines survey data with census/auxiliary records to produce reliable local indicators.",
                "difficulty": 5
            }
        ]
    
    # Return pool (or slice if requested) with guaranteed integer difficulties 1-5
    for q in base_pool:
        q["difficulty"] = _normalize_difficulty(q.get("difficulty"))
    return base_pool[:max(n, len(base_pool))] if n >= len(base_pool) else base_pool[:n]


def generate_quiz_questions(content: str, n: int = 5, language: str = "en") -> list[dict]:
    if not content or len(content.strip()) < 30:
        raise ValueError("Source content too short to generate a meaningful quiz from.")
    lang_name = LANGUAGE_NAMES.get(language, "English")
    # For balanced adaptive pools, request at least 10 questions covering difficulty 1-5
    request_n = max(n, 10)
    prompt = QUIZ_PROMPT_TEMPLATE.format(n=request_n, language=lang_name, content=content[:6000])
    
    # 1. Primary provider: Gemini
    try:
        raw = _call_gemini(prompt)
        parsed = _extract_json(raw)
        if isinstance(parsed, list) and len(parsed) > 0:
            for q in parsed:
                q["difficulty"] = _normalize_difficulty(q.get("difficulty"))
            print("[LLM Provider] Served by Gemini")
            return parsed[:request_n]
        print("[LLM Provider] Gemini returned empty/invalid JSON, falling through to Groq...")
    except Exception as e:
        print(f"[LLM Provider] Gemini failed ({e}), falling through to Groq...")

    # 2. Secondary fallback provider: Groq
    try:
        parsed = _call_groq(prompt)
        if isinstance(parsed, list) and len(parsed) > 0:
            for q in parsed:
                q["difficulty"] = _normalize_difficulty(q.get("difficulty"))
            print("[LLM Provider] Served by Groq (llama-3.3-70b-versatile)")
            return parsed[:request_n]
        print("[LLM Provider] Groq returned empty/invalid JSON, falling through to offline fallback...")
    except Exception as e:
        print(f"[LLM Provider] Groq failed ({e}), falling through to offline fallback...")

    # 3. Deterministic offline fallback (never fails)
    print("[LLM Provider] Served by Deterministic Offline Fallback")
    return _generate_fallback_questions(content, n=request_n, language=language)


def tag_competencies(content: str, competency_names: list[str]) -> list[str]:
    """Zero-shot classification: which FRAC competencies does this material address."""
    if not content or len(content.strip()) < 30 or not competency_names:
        return []
    
    # 1. Fast heuristic matching to avoid redundant 20-30s LLM roundtrips
    content_lower = content[:6000].lower()
    matches = []
    for c in competency_names:
        clow = c.lower()
        if clow in content_lower:
            matches.append(c)
        else:
            tokens = [w for w in clow.split() if len(w) > 4]
            if tokens and any(t in content_lower for t in tokens):
                matches.append(c)
    if matches:
        return list(dict.fromkeys(matches))[:3]
    
    # 2. LLM fallback if no direct lexical affinity is found
    prompt = TAG_PROMPT_TEMPLATE.format(
        competency_list="\n".join(f"- {c}" for c in competency_names),
        content=content[:4000],
    )
    try:
        tagged = _extract_json(_call_llm(prompt))
        return [t for t in tagged if t in competency_names][:3]
    except Exception:
        return []  # non-fatal


def explain_recommendation(competency_name, competency_type, current_level, required_level,
                             module_title, module_description) -> str:
    """One-line, LLM-generated, learner-specific reason for a recommendation."""
    prompt = RATIONALE_PROMPT_TEMPLATE.format(
        competency_name=competency_name, competency_type=competency_type,
        current_level=current_level, required_level=required_level,
        module_title=module_title, module_description=module_description or "",
    )
    try:
        return _call_llm(prompt).strip()
    except Exception:
        return ""  # non-fatal: UI falls back to the non-AI explanation
