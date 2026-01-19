#!/usr/bin/env python3
"""
Generate printable A4 RFI Quiz sheets (HTML format).
Can be printed to PDF from browser.
"""

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

# Answer key: earliest position for each hand
EARLIEST_POSITION = {
    # Pairs
    "AA": "UTG", "KK": "UTG", "QQ": "UTG", "JJ": "UTG", "TT": "UTG",
    "99": "UTG", "88": "UTG", "77": "UTG", "66": "UTG", "55": "UTG",
    "44": "HJ", "33": "BTN", "22": "BTN",
    # Suited Ax
    "AKs": "UTG", "AQs": "UTG", "AJs": "UTG", "ATs": "UTG", "A9s": "UTG",
    "A8s": "UTG", "A7s": "UTG", "A6s": "UTG", "A5s": "UTG", "A4s": "UTG",
    "A3s": "UTG", "A2s": "UTG",
    # Suited Kx
    "KQs": "UTG", "KJs": "UTG", "KTs": "UTG", "K9s": "UTG", "K8s": "UTG",
    "K7s": "UTG", "K6s": "UTG", "K5s": "UTG", "K4s": "HJ", "K3s": "CO", "K2s": "CO",
    # Suited Qx
    "QJs": "UTG", "QTs": "UTG", "Q9s": "UTG", "Q8s": "UTG", "Q7s": "HJ",
    "Q6s": "HJ", "Q5s": "CO", "Q4s": "BTN", "Q3s": "BTN", "Q2s": "BTN",
    # Suited Jx
    "JTs": "UTG", "J9s": "UTG", "J8s": "HJ", "J7s": "CO", "J6s": "BTN",
    "J5s": "BTN", "J4s": "BTN", "J3s": None, "J2s": None,
    # Suited Tx
    "T9s": "UTG", "T8s": "HJ", "T7s": "BTN", "T6s": "BTN", "T5s": None,
    "T4s": None, "T3s": None, "T2s": None,
    # Suited 9x
    "98s": "HJ", "97s": "CO", "96s": "BTN", "95s": None, "94s": None,
    "93s": None, "92s": None,
    # Suited 8x
    "87s": "BTN", "86s": "BTN", "85s": "SB", "84s": None, "83s": None, "82s": None,
    # Suited 7x
    "76s": "BTN", "75s": "BTN", "74s": None, "73s": None, "72s": None,
    # Suited 6x
    "65s": "BTN", "64s": "SB", "63s": None, "62s": None,
    # Suited 5x
    "54s": "BTN", "53s": "SB", "52s": None,
    # Suited 4x
    "43s": None, "42s": None,
    # Suited 3x
    "32s": None,
    # Offsuit Ax
    "AKo": "UTG", "AQo": "UTG", "AJo": "UTG", "ATo": "UTG", "A9o": "HJ",
    "A8o": "CO", "A7o": "BTN", "A6o": "BTN", "A5o": "CO", "A4o": "BTN", "A3o": "BTN", "A2o": None,
    # Offsuit Kx
    "KQo": "UTG", "KJo": "UTG", "KTo": "HJ", "K9o": "BTN", "K8o": "BTN",
    "K7o": None, "K6o": None, "K5o": None, "K4o": None, "K3o": None, "K2o": None,
    # Offsuit Qx
    "QJo": "UTG", "QTo": "HJ", "Q9o": "BTN", "Q8o": None, "Q7o": None,
    "Q6o": None, "Q5o": None, "Q4o": None, "Q3o": None, "Q2o": None,
    # Offsuit Jx
    "JTo": "HJ", "J9o": "BTN", "J8o": None, "J7o": None, "J6o": None,
    "J5o": None, "J4o": None, "J3o": None, "J2o": None,
    # Offsuit Tx
    "T9o": "BTN", "T8o": "BTN", "T7o": None, "T6o": None, "T5o": None,
    "T4o": None, "T3o": None, "T2o": None,
    # Offsuit 9x
    "98o": "BTN", "97o": None, "96o": None, "95o": None, "94o": None,
    "93o": None, "92o": None,
    # Offsuit 8x and below - all fold
    "87o": None, "86o": None, "85o": None, "84o": None, "83o": None, "82o": None,
    "76o": None, "75o": None, "74o": None, "73o": None, "72o": None,
    "65o": None, "64o": None, "63o": None, "62o": None,
    "54o": None, "53o": None, "52o": None,
    "43o": None, "42o": None,
    "32o": None,
}

# UTG edge hands (need memorization)
UTG_EDGES = {"A2s", "K5s", "Q8s", "J9s", "T9s", "KJo", "QJo", "ATo", "55"}

# HJ new hands (earliest = HJ)
HJ_NEW = {h for h, pos in EARLIEST_POSITION.items() if pos == "HJ"}

# CO new hands (earliest = CO)
CO_NEW = {h for h, pos in EARLIEST_POSITION.items() if pos == "CO"}

# BTN hands (earliest = BTN)
BTN_ALL = {h for h, pos in EARLIEST_POSITION.items() if pos == "BTN"}


def get_hand_name(row: int, col: int) -> str:
    r1, r2 = RANKS[row], RANKS[col]
    if row == col:
        return f"{r1}{r2}"
    elif row < col:
        return f"{r1}{r2}s"
    else:
        return f"{r2}{r1}o"


def generate_html(mode: str, show_answers: bool = False) -> str:
    """Generate HTML for a quiz sheet."""

    if mode == "utg_edges":
        title = "UTG 邊緣牌測試"
        subtitle = "填寫這些牌的最早開池位置（UTG 或 Fold）"
        test_hands = UTG_EDGES
    elif mode == "hj_co_new":
        title = "HJ / CO 新增牌測試"
        subtitle = "填寫這些牌的最早開池位置（HJ 或 CO）"
        test_hands = HJ_NEW | CO_NEW
    elif mode == "btn_all":
        title = "BTN 範圍測試"
        subtitle = "填寫這些牌的最早開池位置（BTN 或 Fold）"
        test_hands = BTN_ALL
    elif mode == "full":
        title = "完整 RFI 測試"
        subtitle = "填寫每張牌的最早開池位置"
        test_hands = None  # All hands
    else:
        raise ValueError(f"Unknown mode: {mode}")

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        @page {{
            size: A4;
            margin: 10mm;
        }}
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            background: white;
        }}
        h1 {{
            text-align: center;
            font-size: 18px;
            margin: 5px 0;
        }}
        .subtitle {{
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(13, 1fr);
            gap: 2px;
            max-width: 100%;
            margin: 0 auto;
        }}
        .cell {{
            aspect-ratio: 1;
            border: 1px solid #ccc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            background: white;
        }}
        .cell.test {{
            border: 2px solid #333;
            background: #f5f5f5;
        }}
        .cell.test.utg {{ border-color: #fbbf24; }}
        .cell.test.btn {{ border-color: #ef4444; }}
        .hand {{
            font-weight: bold;
            font-size: 11px;
        }}
        .answer {{
            font-size: 9px;
            color: #666;
            margin-top: 2px;
        }}
        .answer.show {{
            color: #dc2626;
            font-weight: bold;
        }}
        .legend {{
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 10px;
            font-size: 11px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .legend-color {{
            width: 16px;
            height: 12px;
            border-radius: 2px;
        }}
        .fold {{ opacity: 0.4; }}
        @media print {{
            body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        }}
    </style>
</head>
<body>
    <h1>{title}{" (答案)" if show_answers else ""}</h1>
    <p class="subtitle">{subtitle}</p>
    <div class="grid">
'''

    for i in range(13):
        for j in range(13):
            hand = get_hand_name(i, j)
            pos = EARLIEST_POSITION.get(hand)

            # Determine if this cell is part of the test
            if test_hands is None:
                is_test = pos is not None  # Full test: all playable hands
            else:
                is_test = hand in test_hands

            is_fold = pos is None

            cell_class = "cell"
            if is_test:
                cell_class += " test"
                if mode == "utg_edges":
                    cell_class += " utg"
                elif mode == "btn_all":
                    cell_class += " btn"
            if is_fold:
                cell_class += " fold"

            answer_class = "answer show" if show_answers else "answer"
            answer_text = pos if (show_answers and is_test) else ("___" if is_test else "")

            html += f'        <div class="{cell_class}"><span class="hand">{hand}</span>'
            if is_test or (test_hands is None and pos):
                html += f'<span class="{answer_class}">{answer_text}</span>'
            html += '</div>\n'

    html += '''    </div>
    <div class="legend">
        <span class="legend-item"><span class="legend-color" style="background:#7f1d1d;"></span> UTG</span>
        <span class="legend-item"><span class="legend-color" style="background:#b91c1c;"></span> HJ</span>
        <span class="legend-item"><span class="legend-color" style="background:#dc2626;"></span> CO</span>
        <span class="legend-item"><span class="legend-color" style="background:#ef4444;"></span> BTN</span>
        <span class="legend-item"><span class="legend-color" style="background:#fca5a5;"></span> SB</span>
    </div>
</body>
</html>
'''
    return html


def main():
    import os

    output_dir = os.path.dirname(os.path.abspath(__file__))

    modes = [
        ("utg_edges", "UTG邊緣牌"),
        ("hj_co_new", "HJ_CO新增"),
        ("btn_all", "BTN範圍"),
        ("full", "完整測試"),
    ]

    for mode, name in modes:
        # Generate quiz (blank)
        quiz_html = generate_html(mode, show_answers=False)
        quiz_path = os.path.join(output_dir, f"quiz_{mode}.html")
        with open(quiz_path, 'w', encoding='utf-8') as f:
            f.write(quiz_html)
        print(f"Generated: {quiz_path}")

        # Generate answer key
        answer_html = generate_html(mode, show_answers=True)
        answer_path = os.path.join(output_dir, f"quiz_{mode}_answers.html")
        with open(answer_path, 'w', encoding='utf-8') as f:
            f.write(answer_html)
        print(f"Generated: {answer_path}")


if __name__ == "__main__":
    main()
