# PML Extension for `Visual Studio Code`
>This Extension is forked from https://marketplace.visualstudio.com/items?itemName=angelincalu.pml

## Requirements

> Visual studio Code with a version greater than `"^1.29.1"`

## 특징

  .pmlfrm , .pmlmac , .pmlfnc , .pmlobj, .pmldat , .mac , .pmlcmd 에 대해 하이라이트 지원

## 메소드 탐색

    pmlobj, pmlfrm 파일에 대해 메소드 정의로 이동 가능

    - 방법1 :
        - Windows/Linux: `Ctrl + shift + o`

    - 방법2 :
        - Windows/Linux: `Ctrl + P`, and typing `@`

### Snippets

  코드 Template 제공
- **`pmlform`**
- **`pmlformgMar`** Grid를 포함한 pmlfrm , AM용
- **`pmlformgPDMS`** Grid를 포함한 pmlfrm , PDMS용
- **`pmlfunc`** 
- **`pmlmet`** 
- **`pmlobj`** 
- **`pmlbut`**
- **`using namespace`** : 자주 사용하는 namespace를 추천

### 코드 자동완성 기능

- PML object(string, real, array 등)들에 대해 메소드 자동 완성 기능 제공
- 기본적인 코드 완성 기능 제공
- 프로그램 특성 상 5000줄 이상의 코드에서는 로딩이 걸릴 수 있습니다.
