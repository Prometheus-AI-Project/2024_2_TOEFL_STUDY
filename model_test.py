from transformers import pipeline

summarizer = pipeline(
    "summarization",
    model="./t5_small_cnn_dailymail_final",
    tokenizer="./t5_small_cnn_dailymail_final"
)

sample_text = """Artificial intelligence (AI) is intelligence demonstrated by machines,
as opposed to the natural intelligence displayed by animals including humans.
AI research involves building machines that can perform tasks requiring human intelligence.
"""

summary = summarizer(sample_text, max_length=60, min_length=10, do_sample=False)
print("Generated summary:", summary[0]['summary_text'])
