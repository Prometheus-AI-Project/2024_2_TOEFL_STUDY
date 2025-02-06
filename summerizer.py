# summarizer.py
import torch
from transformers import BartTokenizer, BartForConditionalGeneration
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "facebook/bart-large-cnn"

# 로컬에 이미 다운로드되었다면 from_pretrained 시 빠르게 로드됩니다.
tokenizer = BartTokenizer.from_pretrained(model_name)
model = BartForConditionalGeneration.from_pretrained(model_name)

# GPU / CPU 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

def summarize_text(text: str) -> str:
    """
    입력된 text(문자열)을 받아 BART 모델로 요약하여 문자열 형태로 반환합니다.
    """
    # 토크나이저로 입력 데이터 변환
    inputs = tokenizer(
        text,
        return_tensors="pt",
        max_length=1024,
        truncation=True
    )
    # 모델에 전달할 tensor를 device로 이동
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # 요약 생성
    summary_ids = model.generate(
        inputs["input_ids"],
        num_beams=5,         # Beam Search 탐색 개수
        length_penalty=2.0,  # 1보다 크면 긴 요약을 선호
        min_length=50,       # 생성 요약의 최소 길이
        max_length=200,      # 생성 요약의 최대 길이
        early_stopping=True
    )
    # 토큰 아이디를 실제 요약 문자열로 디코딩
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return summary

if __name__ == "__main__":
    sample_text = (
        "Although the Mediterranean Sea is connected to the Atlantic Ocean, it is almost completely "
        "enclosed by land. Throughout history, it has played a central role in the rise of Western "
        "civilization. Powerful countries struggled with each other to have full use of it because "
        "of its importance to trade. Thus, numerous societies attempted to colonize the coastline. "
        "Two of the earliest civilizations to do so were the Greek city-states and Phoenicia, whose "
        "merchants used the sea extensively as a highway for commerce. Later, however, the region was "
        "taken over by the Romans, who went on to control the sea and its coastal regions for the next "
        "400 years. They called the Mediterranean Mare Nostrum, or 'Our Sea.' As the Roman Empire was "
        "largely concentrated in coastal areas, the Mediterranean was extremely significant for the "
        "Romans’ commerce and naval development. After Rome collapsed in AD 476, countries continued "
        "to struggle for supremacy as the region switched hands many times. Today, the Mediterranean "
        "Sea’s control resides largely with the European Union, and it still represents one of the "
        "largest areas for commerce in the world."
    )

    generated_summary = summarize_text(sample_text)
    print("\n=== Generated Summary ===")
    print(generated_summary)
