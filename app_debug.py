import comment_maker
import twin_problem_maker
import json

with open('toefl_dataset_final.json', encoding='utf-8') as f:
    data = json.load(f) # json 파일을 dictionary 형태로 불러옴

def debug_make_comment(document_id, question_num):
    document = next((item for item in data if item['document_id'] == document_id), None)
    if document is None:
        print("Document not found")
        return

    problem = next((item for item in document["문제들"] if item["번호"] == question_num), None)
    if problem is None:
        print("Problem not found")
        return

    passage = document["passage"][0]
    print(f"Passage: {passage}")

    comment = comment_maker.make_comment(passage, problem)
    print(f"Generated comment: {comment}")

    with open(f"comment_지문{document_id}_문제{question_num}.txt", mode="w", encoding="utf-8") as f:
        f.write(comment)


def debug_make_twin_problem(document_id, question_num):

    document = next((item for item in data if item['document_id'] == document_id), None)
    if document is None:
        print("Document not found")
        return

    problem = next((item for item in document["문제들"] if item["번호"] == question_num), None)
    if problem is None:
        print("Problem not found")
        return

    passage = document["passage"][0]
    print(f"Passage: {passage}")

    twin_problem = twin_problem_maker.make_twin_problem(passage, problem)
    print(f"Generated twin problem:\n{twin_problem}")

    with open(f"twin_지문{document_id}_문제{question_num}.txt", mode="w", encoding="utf-8") as f:
        f.write(twin_problem)

# Example usage
# debug_make_comment(2, "According to paragraph 1, which of the following is NOT true of properly functioning hearing?")
# debug_make_comment(10, "Where would the following sentence best fit: 'These include stones, ceramics, metals, and concrete, as well as eyeglasses, gems, and computer chips.'")
# debug_make_comment(10, "The word '**fundamental**' in the passage is closest in meaning to:")


# debug_make_twin_problem(2, "According to paragraph 1, which of the following is NOT true of properly functioning hearing?")
# debug_make_twin_problem(10, "Where would the following sentence best fit: 'These include stones, ceramics, metals, and concrete, as well as eyeglasses, gems, and computer chips.'")
# debug_make_twin_problem(10, "The word '**fundamental**' in the passage is closest in meaning to:")

debug_make_twin_problem(1, 9)