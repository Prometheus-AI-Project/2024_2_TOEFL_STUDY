from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Seq2SeqTrainer, Seq2SeqTrainingArguments, DataCollatorForSeq2Seq
from datasets import load_dataset
import torch

# 1. 모델 및 토크나이저 초기화
model_name = "facebook/bart-large-xsum"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# 2. CNN/DailyMail 데이터셋 로드
dataset = load_dataset("cnn_dailymail", "3.0.0")

# 3. 데이터셋 샘플링 (각 train/validation에서 200개씩만 사용)
dataset["train"] = dataset["train"].select(range(200))
dataset["validation"] = dataset["validation"].select(range(200))

# 4. 전처리 함수 정의
def preprocess_function(examples):
    inputs = [doc for doc in examples["article"]]
    model_inputs = tokenizer(inputs, max_length=1024, truncation=True)

    # Target(summary) 처리
    with tokenizer.as_target_tokenizer():
        labels = tokenizer(examples["highlights"], max_length=128, truncation=True)

    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

# 5. 데이터셋 전처리
encoded_dataset = dataset.map(preprocess_function, batched=True)

# 6. 데이터 콜레이터 설정
data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

# 7. 트레이닝 설정
training_args = Seq2SeqTrainingArguments(
    output_dir="./xsum-cnn-finetuned",
    evaluation_strategy="epoch",
    learning_rate=3e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    weight_decay=0.01,
    save_total_limit=3,
    num_train_epochs=5,
    predict_with_generate=True,
    fp16=torch.cuda.is_available(),  # GPU 사용 시 FP16 적용
    report_to="none"  # 🚫 wandb 비활성화
)

# 8. 트레이너 초기화
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=encoded_dataset["train"],
    eval_dataset=encoded_dataset["validation"],
    tokenizer=tokenizer,
    data_collator=data_collator,
)

# 9. 파인튜닝 시작
trainer.train()

# 10. 모델 저장
model.save_pretrained("./xsum-cnn-finetuned")
tokenizer.save_pretrained("./xsum-cnn-finetuned")
