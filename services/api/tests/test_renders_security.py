from fastapi.testclient import TestClient


def test_rejects_python_payload(client: TestClient) -> None:
    response = client.post(
        "/v1/renders",
        json={
            "spec": {
                "version": 1,
                "kind": "function-2d",
                "expression": "eval(x)",
                "parameters": {"a": 1},
            }
        },
    )
    assert response.status_code == 422
