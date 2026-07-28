"""
Harness de avaliacao da recuperacao do RAG.

Mede, de forma objetiva, se a busca traz o trecho ESPERADO no topo.
E o instrumento que diz se o RAG esta bom ANTES de confiar nele: quando
trocarmos o vetorizador simples pelos embeddings reais e ingerirmos o livro
de verdade, rodamos este arquivo e comparamos a taxa de acerto.
"""

import os
from poc_rag import ingerir, buscar

# Casos de teste: pergunta -> codigo BNCC do trecho que DEVERIA vir no topo
CASOS = [
    ("o que e uma fracao equivalente?",        "EF06MA07"),
    ("como calcular a area de um retangulo?",  "EF06MA29"),
    ("quais os divisores de 12?",              "EF06MA05"),
    ("o que significa o algarismo pela posicao?", "EF06MA01"),
    ("o que e a parte decimal de um numero?",  "EF06MA08"),
]


def avaliar(trechos) -> float:
    acertos = 0
    print("Avaliacao da recuperacao (top-1):\n")
    for pergunta, esperado in CASOS:
        recuperados = buscar(pergunta, trechos, top_k=1)
        obtido = recuperados[0][0].codigo_bncc if recuperados else "-"
        ok = obtido == esperado
        acertos += 1 if ok else 0
        marca = "OK " if ok else "XX "
        print(f"  {marca} esperado={esperado}  obtido={obtido}  | {pergunta}")
    taxa = acertos / len(CASOS)
    print(f"\nTaxa de acerto top-1: {acertos}/{len(CASOS)} = {taxa:.0%}")
    return taxa


if __name__ == "__main__":
    caminho = os.path.join(os.path.dirname(__file__), "exemplo", "conteudo_6ano_mat.md")
    avaliar(ingerir(caminho))
