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
해당기능이 활성화 안될 경우 Ctrl + Space키를 누름
- PML object(string, real, array 등)들에 대해 메소드 자동 완성 기능 제공
  ![pmleditorpeview4](https://user-images.githubusercontent.com/90903869/204969268-6845efec-44f0-401f-b46a-9c92b5881cc0.gif)

- 작성된 변수를 인식하여 object에 해당하는 method 리스팅 및 매개변수 정보 제공
  ![pmlediterpreview](https://user-images.githubusercontent.com/90903869/204967771-2d223240-3cf1-408e-9758-9ba61427fdf4.gif)
  ![pmlediterpreview2](https://user-images.githubusercontent.com/90903869/204968069-6339d991-76b9-4100-9dbd-3086fa6a7622.gif)
  
  do, if, handle 및 logical function 등에 대한 자동완성 기능 제공(누락된 부분 추가 요청 바람)
![pmleditorpreview3](https://user-images.githubusercontent.com/90903869/204968609-cc9f8931-fd6a-41f4-a13f-7a912a771058.gif)



