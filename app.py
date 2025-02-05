from flask import request, jsonify, render_template
from config import app
import json
import comment_maker
import twin_problem_maker
import summerizer

# 데이터 로드 (JSON 파일을 불러옵니다)
with open('toefl_dataset_final.json', encoding='utf-8') as f:
    data = json.load(f) # json 파일을 dictionary 형태로 불러옴

@app.route('/')
def brand():
    return render_template('brand.html')

@app.route('/main')
def index():
    return render_template('index.html')

@app.route('/list')
def list_page():
    """
    /list?level=basic 혹은 /list?level=intermediate ...
    -> list_page.html
    """
    # list_page.html 내부에서 JS가 /api/toefl_data를 fetch하여 제목 리스트를 구성
    level = request.args.get('level', 'basic')
    return render_template('list_page.html', level=level)

@app.route('/select_question')
def select_question():
    """
    /select_question?document_id=XX -> select_question.html
    """
    document_id = request.args.get('document_id', 0)
    return render_template('select_question.html', document_id=document_id)

@app.route('/api/toefl_data')
def get_toefl_data():
    """
    JSON 파일을 읽어와, JS에서 fetch("/api/toefl_data")로 가져갈 수 있게 함
    """
    with open('toefl_dataset_final.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/get_passage', methods=['GET'])
def get_passage():

    # 요청에서 id를 가져옵니다 (예: /get_passage?id=1)
    document_id = request.args.get('id', type=int)

    # 해당 id에 맞는 passage 찾기
    document = next((item for item in data if item['document_id'] == document_id), None) # document는 dictionary 형태로 자료가 들어있음.

    # 데이터가 없을 경우 오류 메시지 반환
    if document is None:
        return jsonify({"error": "Document not found"}), 404

    # 해당 데이터 반환
    return jsonify(document)


@app.route('/make_comment', methods=['GET'])
def make_comment():

    document_id = request.args.get('id', type=int)
    question_num = request.args.get('question_num', type=int)

    # document: dictionary임
    document = next((item for item in data if item['document_id'] == document_id), None)
    if document is None:
        return jsonify({"error": "Document not found"}), 404
    
    # problem: dictionary 형태임
    problem = next((item for item in document["문제들"] if item["번호"] == question_num), None)
    if problem is None:
        return jsonify({"error": "Problem not found"}), 404

    # passage: dictionary임
    passage = document["passage"][0]
    
    # comment: str(문자열)임
    comment = comment_maker.make_comment(passage, problem)

    return jsonify({'comment': comment})

@app.route('/make_twin_problem', methods=['GET'])
def make_twin_problem():

    document_id = request.args.get('id', type=int)
    question_num = request.args.get('question_num', type=int)

    # document: dictionary임
    document = next((item for item in data if item['document_id'] == document_id), None)
    if document is None:
        return jsonify({"error": "Document not found"}), 404
    
    # problem: dictionary임
    problem = next((item for item in document["문제들"] if item["번호"] == question_num), None)
    if problem is None:
        return jsonify({"error": "Problem not found"}), 404

    # passage: dictionary임 
    passage = document["passage"][0]
    
    # twin_problem: json 형식의 str(문자열)임
    twin_problem = twin_problem_maker.make_twin_problem(passage, problem)

    return jsonify({'twinProblem': twin_problem})

@app.route('/summarize_passage', methods=['GET'])
def summarize_passage():
    """
    /summarize_passage?id=문서번호

    1) id로 문서 찾기
    2) passage가 [ { "paragraph 1": "...", "paragraph 2": "..."} ] 형태라 가정
    3) 딕셔너리의 (키, 값)을 순회하며 요약
    4) 결과 반환
    """
    document_id = request.args.get('id', type=int)

    # 예: toefl_dataset_final.json에서 불러온 data
    with open('toefl_dataset_final.json', encoding='utf-8') as f:
        data = json.load(f)

    # 해당 id에 맞는 passage 찾기
    document = next((item for item in data if item['document_id'] == document_id), None)

    if document is None:
        return jsonify({"error": "Document not found"}), 404

    # "passage"는 리스트 형태이고,
    # 그 안에 하나의 딕셔너리가 "paragraph 1", "paragraph 2", ... 등의 키를 갖고 있다고 가정
    paragraphs_list = document.get("passage", [])

    if not paragraphs_list:
        return jsonify({"error": "No passage found"}), 404

    # 리스트 안의 첫 번째(혹은 필요에 따라 모든 딕셔너리)를 꺼내어 순회
    paragraphs_dict = paragraphs_list[0]  # 예: {"paragraph 1": "...", "paragraph 2": "...", ...}

    summarized_paragraphs = []
    for para_key, para_text in paragraphs_dict.items():
        # para_text = 실제 문단 내용 (문자열)
        summary = summerizer.summarize_text(para_text)
        summarized_paragraphs.append({
            "paragraph_key": para_key,  # e.g. "paragraph 1"
            "original": para_text,
            "summary": summary
        })

    return jsonify({
        "document_id": document_id,
        "summaries": summarized_paragraphs
    })

if __name__ == '__main__':
    app.run(debug=True)