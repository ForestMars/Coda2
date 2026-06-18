#!/usr/bin/env python3
import subprocess
import re

def get_ollama_models():
    try:
        # Run the 'ollama list' command
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, check=True)
        lines = result.stdout.strip().split('\n')
        if len(lines) <= 1:
            return []
        
        models = []
        # Skip the header line
        for line in lines[1:]:
            # Use regex to handle variable whitespace spacing
            parts = re.split(r'\s{2,}', line.strip())
            if len(parts) >= 4:
                # Handle cases where ID, Size, or Modified columns might group slightly differently
                name = parts[0]
                model_id = parts[1]
                size = parts[2]
                # Combine remaining parts if 'Modified' contains spaces (e.g., "5 weeks ago")
                modified = " ".join(parts[3:])
                
                # Determine thinking capability
                thinking = "No"
                name_lower = name.lower()
                if "qwen3" in name_lower:
                    thinking = "Hybrid (Native Switchable)"
                elif "deepseek-r1" in name_lower or "-r1" in name_lower or "reasoning" in name_lower:
                    thinking = "Yes (Reasoning/CoT Model)"
                elif "coder" in name_lower:
                    thinking = "No (Code LLM)"
                elif "embed" in name_lower:
                    thinking = "No (Embedding Model)"
                elif "agent" in name_lower:
                    thinking = "No (Agentic LLM)"
                else:
                    thinking = "No"
                
                models.append([name, model_id, size, modified, thinking])
        return models
    except FileNotFoundError:
        print("Error: 'ollama' command not found. Make sure Ollama is installed and in your PATH.")
        return None
    except subprocess.CalledProcessError:
        print("Error: Failed to execute 'ollama list'. Is the Ollama service running?")
        return None

def print_ascii_table(models):
    if not models:
        print("No local Ollama models found.")
        return

    headers = ["NAME", "ID", "SIZE", "MODIFIED", "THINKING MODEL?"]
    
    # Calculate dynamic column widths based on longest content
    col_widths = [len(h) for h in headers]
    for row in models:
        for i in range(5):
            if len(row[i]) > col_widths[i]:
                col_widths[i] = len(row[i])
                
    # Build the separator line: +-----+----+
    sep = "+" + "+".join(["-" * (w + 2) for w in col_widths]) + "+"
    
    # Print table
    print(sep)
    header_row = "| " + " | ".join([f"{headers[i]:<{col_widths[i]}}" for i in range(5)]) + " |"
    print(header_row)
    print(sep)
    
    for row in models:
        model_row = "| " + " | ".join([f"{row[i]:<{col_widths[i]}}" for i in range(5)]) + " |"
        print(model_row)
        
    print(sep)

if __name__ == "__main__":
    model_data = get_ollama_models()
    if model_data is not None:
        print_ascii_table(model_data)
