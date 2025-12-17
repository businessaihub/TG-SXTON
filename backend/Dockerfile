FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Create startup script
RUN echo '#!/bin/bash\npython init_data.py\nuvicorn server:app --host 0.0.0.0 --port 8001' > /start.sh && chmod +x /start.sh

CMD ["/start.sh"]
