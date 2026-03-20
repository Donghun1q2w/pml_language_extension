# Simplify: 코드 품질 개선 및 버그 수정

- **Date**: 2026-03-20
- **Author**: Claude (simplify review)

## Rationale / Plan

`/simplify` 스킬을 통해 최근 커밋(e7fe950)의 변경 사항을 3개 에이전트(재사용/품질/효율)로 병렬 리뷰 후 발견된 이슈를 수정.

## Changed Files

| File | Status | Description |
|------|--------|-------------|
| `src/extension.ts` | Modified | TOCTOU 제거, GettingGadget 캐싱, console.log 제거, reloadDictionaries att_inhouse 누락 수정 |
| `snippets/helpers.json` | Modified | 오타 수정 (colelctallfor → collectallfor, emplate → Template) |
| `.gitignore` | Modified | .DS_Store, .omc 추가 |

## Details

### `src/extension.ts` (Modified)

- `loadCustomDictionaries()`: `fs.existsSync` TOCTOU 가드 제거, catch 블록에서 `ENOENT` 코드 분기로 대체
- `get_AllVariables()` 루프: `GettingGadget(line)` 3중 호출을 `gadgetResult` 변수에 캐싱하여 1회 호출로 변경
- `get_AllVariables()`: 프로덕션 핫 패스의 `console.log(lineContent)` 디버그 로그 제거
- `reloadDictionaries()`: `att_inhouse` attributetable 재병합 로직 누락 수정 (activate()와 동일하게)

### `snippets/helpers.json` (Modified)

- `!!collectallfor` description: "colelctallfor" → "!!collectallfor function" 오타 수정
- 7개 logical function snippet description: "emplate" → "Template" 오타 일괄 수정

### `.gitignore` (Modified)

- `.DS_Store` (macOS 메타데이터 파일) 추가
- `.omc` (oh-my-claudecode 상태 디렉토리) 추가
