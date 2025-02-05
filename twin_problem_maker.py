from config import get_api_key
import google.generativeai as genai

def make_twin_problem(passage, problem):
    GOOGLE_API_KEY = get_api_key()
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    passage = str(passage)
    question = problem["질문"]
    question_type = problem["유형"]
    options = problem["선택지"]
    answer = problem["정답"]

    instruction = ""
    if question_type == "vocabulary":
        instruction = "Choose a word that is not already surrounded with ** ** in the passage."
    elif question_type == "reference":
        instruction = "Choose a pronoun that is not already surrounded with ** ** in the passage."
    elif question_type == "sentence simplification":
        instruction = "Choose a sentence that is not already surrounded with ** ** in the passage."
    elif question_type == "rhetorical question":
        instruction = "Choose a phrase that is not already surrounded with ** ** in the passage."
    elif question_type == "sentence insertion":
        instruction = "Put (E), (F), (G), (H) separately between the sentences in the passage. Set 선택지 as ['E.', 'F.', 'G.', 'H.'] Remove a sentence after one of them from the passage, and make that the answer."

    # 프롬프트에 인용된 단어나 문구의 위치를 모두 제공하도록 지시 추가
    prompt = f'''
    ## Instructions
    I'll give you a TOEFL passage, a question for that passage, the type of the question, the options, and the answer.
    Make a new question with the exact same structure with the given question but with different content based on the passage, in the following format.
    If you choose a phrase, word, or sentence from the passage, edit the passage by surrounding it with ** **.

    For every word or phrase quoted from the passage in the question or options, provide its exact location in the format: 
    "in paragraph (paragraph number), (line number)th line".

    Keep the paragraph division and json format of the passage.
    Additionally, provide the explanation for the correct answer briefly in Korean.

    {instruction}

    ## Passage
    {passage}

    ## Question
    {question}

    ## Question Type
    {question_type}

    ## Options
    {options}

    ## Answer
    {answer}

    ## Format: Follow the json format below. It should start and end with a curly bracket.
    {{
        "passage": {{
            "paragraph 1": "Put the first paragraph here",
            "paragraph 2": "Put the second paragraph here",
            "paragraph n": "Put the nth paragraph here"
        }},
        "problem": {{
            "유형": "{question_type}",
            "질문": Write the new question here, indicating the location of any quoted words or phrases,
            "선택지": Write the new options here, with locations for any quoted words or phrases,
            "정답": Write the new answer here,
            "해설": Correctly explain why the answer is correct in Korean
        }}
    }}
    '''

    # Generating the response from Gemini
    response = model.generate_content(prompt)
    text = response.text

    # Extracting the JSON output from the response text
    start_idx = text.index('{')
    end_idx = text.rfind('}')
    twin_problem = text[start_idx: end_idx + 1]

    return twin_problem
