# scripts

## build-single-html.mjs

ビルド成果物を1枚のHTMLにまとめる(Artifactプレビュー用)。

```bash
VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 npm run build
node scripts/build-single-html.mjs 出力先.html
```

- `VITE_SINGLE_FILE=1` … フォント等の全アセットをdata URIで埋め込む
- `VITE_USE_HASH_ROUTER=1` … ルーティングをハッシュ方式に切替

## 同梱フォントについて

`src/assets/fonts/` のフォントは以下の手順で生成したもの。

- `inter-latin(-ext)-wght-normal.woff2` … `@fontsource-variable/inter` から複製
- `noto-sans-jp-subset.woff2` … Noto Sans JP 可変フォント(google/fonts リポジトリの
  `NotoSansJP[wght].ttf`)を fonttools でサブセット化:
  常用漢字2136字 + ひらがな/カタカナ + ASCII/全角英数 + 記号類 + 食事関連の常用外漢字
  (約2,950コードポイント、ウェイト軸 100–900 保持)

  ```bash
  pip install fonttools brotli
  python3 -m fontTools.subset "NotoSansJP[wght].ttf" \
    --unicodes-file=subset-unicodes.txt \
    --flavor=woff2 --layout-features+=palt \
    --output-file=noto-sans-jp-subset.woff2
  ```

サブセット外の稀な漢字は端末のシステムフォントにフォールバックする。
