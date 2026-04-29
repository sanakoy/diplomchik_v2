from locust import HttpUser, constant, constant_throughput, task
from src.settings import settings


class APIUser(HttpUser):
    host = settings.SERVICE_URL
    wait_time = constant_throughput(0.2)

    def on_start(self):
        self.headers = {
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZDIxNTg5Yy05NjQ0LTQwNzAtYTI0Yy01MGQ2NjIyZTE4OTAiLCJleHAiOjIzNzI1NDY5NDUsImlhdCI6MTc3MjU0NzAwNSwidHlwZSI6ImFjY2VzcyJ9.iMMRIsfDmvJY7kMtqjwWa5XQYS0keAnnaD9YrJTwj8s"
        }

    @task
    def get_categories(self):
        self.client.get("/api/v1/categories/spending", headers=self.headers)
