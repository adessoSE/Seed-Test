---
name: review
description: Code-Review der aktuellen Änderungen nach Seed-Test-Projektregeln
---

Führe ein Code-Review der aktuellen Änderungen durch.

## Schritte

1. Ermittle die geänderten Dateien:
   - Wenn auf einem Feature-Branch: `git diff master...HEAD` für alle Branch-Änderungen
   - Sonst: `git diff` (staged + unstaged)
2. Starte den `code-reviewer` Agent (subagent_type: "code-reviewer") mit den Diffs als Kontext.
3. Fasse die Findings zusammen, gruppiert nach Severity (HIGH → MEDIUM → LOW).

## Ausgabeformat

```json
{
    "summary": "Kurzfassung des Reviews",
    "findings": [
        {
            "file": "backend/src/services/story.service.ts",
            "line": 42,
            "message": "Beschreibung des Problems",
            "severity": "HIGH|MEDIUM|LOW",
            "suggestion": "Änderungsvorschlag",
            "code_suggestion": "Exakter Ersatzcode oder null",
            "suggestion_range": "-0+0"
        }
    ]
}
```
