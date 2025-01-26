import re
import torch
from datasets import load_dataset
from transformers import (
    T5Tokenizer,
    T5ForConditionalGeneration,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq
)

# --------------------------------------------------------------------------------
# 1. 데이터셋 로드 (CNN/DailyMail)
# --------------------------------------------------------------------------------
dataset = load_dataset("abisee/cnn_dailymail", "3.0.0")


# --------------------------------------------------------------------------------
# 2. 텍스트 정제 함수
# --------------------------------------------------------------------------------
def clean_text(text: str) -> str:
    """
    - (CNN) 등의 패턴 제거
    - \n, \r 같은 특수문자를 공백으로 대체
    - HTML 태그 제거
    - 알파벳, 숫자, 공백, 일부 문장부호(.,?!,) 제외한 문자 제거
    - 다중 공백 -> 단일 공백
    - 소문자화, strip
    """
    if not isinstance(text, str):
        return ""

    # (CNN) 제거
    text = re.sub(r"\(CNN\)\s*", "", text)
    # 개행 문자 제거
    text = re.sub(r"[\r\n]+", " ", text)
    # HTML 태그 제거
    text = re.sub(r"<[^>]*>", "", text)
    # 알파벳/숫자/공백/.,?!를 제외한 문자 제거
    text = re.sub(r"[^a-zA-Z0-9\s\.\,\?\!]", " ", text)
    # 다중 공백 -> 단일 공백
    text = re.sub(r"\s+", " ", text)
    # 소문자화 및 공백 제거
    text = text.lower().strip()

    return text


# --------------------------------------------------------------------------------
# 3. 너무 짧은 텍스트 필터링
# --------------------------------------------------------------------------------
def filter_short_texts(examples):
    """
    - article 단어 수 < 30 이면 제외
    - highlight 단어 수 < 5 이면 제외
    """
    article = examples["article"]
    highlight = examples["highlights"]

    if not article or not highlight:
        return False
    if len(article.split()) < 30:
        return False
    if len(highlight.split()) < 5:
        return False
    return True


# --------------------------------------------------------------------------------
# 4. 각 스플릿에 필터 적용
# --------------------------------------------------------------------------------
dataset["train"] = dataset["train"].filter(filter_short_texts)
dataset["validation"] = dataset["validation"].filter(filter_short_texts)
dataset["test"] = dataset["test"].filter(filter_short_texts)


# --------------------------------------------------------------------------------
# 5. 텍스트 클리닝
# --------------------------------------------------------------------------------
def cleaning_map(examples):
    cleaned_articles = [clean_text(a) for a in examples["article"]]
    cleaned_highlights = [clean_text(h) for h in examples["highlights"]]
    return {"article": cleaned_articles, "highlights": cleaned_highlights}


dataset = dataset.map(cleaning_map, batched=True)

# --------------------------------------------------------------------------------
# 6. 모델 및 토크나이저 불러오기
# --------------------------------------------------------------------------------
model_name = "t5-small"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)


# --------------------------------------------------------------------------------
# 7. 토크나이징 함수 정의
# --------------------------------------------------------------------------------
def preprocess_function(examples):
    """
    - 입력: "summarize: " + 기사(article)
    - 레이블: 요약문(highlights)
    - 둘 다 padding, truncation을 확실하게 적용
    """
    # 1) 기사(article)에 "summarize: " 접두어
    inputs = ["summarize: " + doc for doc in examples["article"]]

    # 2) 입력 토크나이징
    model_inputs = tokenizer(
        inputs,
        max_length=512,
        padding="max_length",
        truncation=True
    )

    # 3) 레이블(요약문) 토크나이징
    with tokenizer.as_target_tokenizer():
        labels = tokenizer(
            examples["highlights"],
            max_length=128,
            padding="max_length",
            truncation=True
        )
    model_inputs["labels"] = labels["input_ids"]

    return model_inputs


# --------------------------------------------------------------------------------
# 8. 토큰화 적용
# --------------------------------------------------------------------------------
tokenized_datasets = dataset.map(preprocess_function, batched=True)

# --------------------------------------------------------------------------------
# 9. DataCollatorForSeq2Seq
# --------------------------------------------------------------------------------
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model,
    pad_to_multiple_of=8  # (옵션) GPU 텐서 연산 최적화
)

# --------------------------------------------------------------------------------
# 10. 학습 하이퍼파라미터 설정
# --------------------------------------------------------------------------------
training_args = TrainingArguments(
    output_dir="./t5_small_cnn_dailymail",
    evaluation_strategy="steps",  # 특정 step마다 평가
    eval_steps=5000,  # 데이터가 크므로 자주 평가하면 학습이 느려질 수 있음
    save_steps=5000,  # 체크포인트 저장 주기
    per_device_train_batch_size=4,  # GPU VRAM에 따라 조절
    per_device_eval_batch_size=4,
    num_train_epochs=3,  # 예: 3epoch 정도 설정
    logging_steps=1000,
    save_total_limit=2,
    load_best_model_at_end=True,
    fp16=torch.cuda.is_available(),
)

# --------------------------------------------------------------------------------
# 11. Trainer 초기화
# --------------------------------------------------------------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["validation"],
    tokenizer=tokenizer,
    data_collator=data_collator
)

# --------------------------------------------------------------------------------
# 12. 모델 학습
# --------------------------------------------------------------------------------
trainer.train()

# --------------------------------------------------------------------------------
# 13. 모델 저장
# --------------------------------------------------------------------------------
trainer.save_model("./t5_small_cnn_dailymail_final")
tokenizer.save_pretrained("./t5_small_cnn_dailymail_final")

print("모델 및 토크나이저가 저장되었습니다: './t5_small_cnn_dailymail_final'")

# --------------------------------------------------------------------------------
# 14. 추론 테스트 (옵션)
# --------------------------------------------------------------------------------
# 아래 주석을 해제하고 테스트해보세요.
"""
from transformers import pipeline

summarizer = pipeline(
    "summarization",
    model="./t5_small_cnn_dailymail_final",
    tokenizer="./t5_small_cnn_dailymail_final"
)

sample_text = \"\"\"Artificial intelligence (AI) is intelligence demonstrated by machines,
as opposed to the natural intelligence displayed by animals including humans.
AI research involves building machines that can perform tasks requiring human intelligence.\"\"\"

summary = summarizer(sample_text, max_length=50, min_length=10, do_sample=False)

print("Generated summary:", summary[0]['summary_text'])
"""
