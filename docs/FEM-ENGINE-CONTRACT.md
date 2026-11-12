# FEM 엔진 연동 계약 (inovaaiweb ↔ FEM Python Worker)

클로드 작업(#9, `inova_mesh`) 완료 후 웹과 메싱 엔진을 연결하기 위한 HTTP 계약입니다.

## 환경변수 (`inovaaiweb`)
- `FEM_ENGINE_URL`: 엔진 워커 기본 URL (예: `https://fem-engine-worker-xxxx.run.app`). 미설정 시 웹은 `503 ENGINE_NOT_CONFIGURED`를 반환하고 작업 횟수를 차감하지 않는다.
- `FEM_ENGINE_API_KEY`: (선택) 워커 인증용 Bearer 토큰 (`Authorization: Bearer <token>`).

## 1. 메싱 작업 제출
`POST {FEM_ENGINE_URL}/v1/mesh/jobs` (`multipart/form-data`)

### Form Fields
- `job_id`: 웹 DB(`fem_jobs.id`) UUID
- `user_id`: 사용자 UUID
- `settings`: JSON 문자열
  ```json
  {
    "size": 10,
    "unit": "mm",
    "strategy": "hex",
    "order": "linear",
    "jacobian": 0.2,
    "aspect": 10
  }
  ```
- `file`: `.step` / `.stp` / `.brep` 파일 (최대 100 MiB)

### Response (`200` / `202`)
```json
{
  "engineJobId": "eng_01J...",
  "status": "queued",
  "metrics": null
}
```

## 2. 작업 상태 및 품질 지표 조회
`GET {FEM_ENGINE_URL}/v1/mesh/jobs/{engineJobId}`

### Response (`200`)
```json
{
  "engineJobId": "eng_01J...",
  "status": "completed",
  "stage": "export",
  "metrics": {
    "elements": 12480,
    "hex": 11920,
    "wedge": 560,
    "tet": 0,
    "minScaledJacobian": 0.42,
    "maxAspectRatio": 4.8,
    "invalidElements": 0
  },
  "errorMessage": null
}
```
- `status`: `"queued" | "running" | "completed" | "failed" | "canceled"`

## 3. 결과 파일 다운로드
`GET {FEM_ENGINE_URL}/v1/mesh/jobs/{engineJobId}/artifacts/{format}`
- `format`: `"inp"` (Abaqus INP) 또는 `"msh"` (Gmsh MSH)
- `200 OK`, 바이너리 스트림 반환.

