from config import get_api_key
import google.generativeai as genai

def make_comment(passage, problem):
    GOOGLE_API_KEY = get_api_key()
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    passage = str(passage)
    question = problem["질문"]
    answer = problem["정답"]
    wrong_options = [option for option in problem["선택지"] if option != answer]

    prompt = f'''
    ## Instructions
    I'll give you a TOEFL passage, a question for that passage, its answer, and its wrong answers.
    Write the explanation for the answers of a given TOEFL problem in the following format in Korean, but keep the quotations from the passage as English.
    provide the explaination briefly.

    ## Passage
    {passage}

    ## Question
    {question}

    ## Answer
    {answer}

    ## Wrong Answers
    {wrong_options[0]}
    {wrong_options[1]}
    {wrong_options[2]}

    ## Format
    [정답 해설] {answer}:
    (write why the answer is correct here)

    [오답 해설]
    {wrong_options[0]}:
    (write why the first wrong answer is wrong here)

    {wrong_options[1]}:
    (write why the second wrong answer is wrong here)

    {wrong_options[2]}:
    (write why the third wrong answer is wrong here)
    '''

    response = model.generate_content(prompt)
    comment = response.text

    return comment