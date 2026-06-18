# Template Base

Plantilla base **agnóstica de lenguaje** para iniciar repos y derivar plantillas específicas (Node, PHP, Python, Go, etc.). Optimizada para uso con **VS Code** y edición directa en **GitHub**.

> Repo: <https://github.com/oriolcortes/template-base>

## ¿Qué incluye?

- Ajustes de editor y estilos básicos (`.editorconfig`, `.gitattributes`, `.gitignore`, `.vscode`).
- Linter de Markdown vía **GitHub Actions** (se ejecuta en cada push/PR).
- Plantillas de **issues** (bug/mejora) y **pull request**.
- Documentos básicos: `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `LICENSE`, `CHANGELOG`.

## Uso

1. Crea un repo desde esta plantilla (o copia los archivos).
2. Si vas a reutilizarla, marca el repo como **Template repository** (Settings → Features).
3. Opcional: activa protección de rama en `main` y exige el check **Markdown Lint**.

## Derivados por lenguaje

En cada derivado añade lo específico del stack (dependencias, tests, lints, workflows adicionales).
Convención sugerida de nombres: `template-{lenguaje|runtime}-{framework?}-{variant?}`
Ej.: `template-node-express-docker`, `template-python-fastapi-docker`.

## Licencia

MIT (ver `LICENSE`).
