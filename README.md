# Stream Deck Agent Status

Plugin UUID:

```text
com.jurri.agent-status
```
Action UUID:
```text
com.jurri.agent-status.status
```

## Installieren / bauen / linken
```shell
cd C:\Users\JuriDerewjanko\dev\Tools\streamdeck\agent-status

npm install
npm run build
npm run validate
npm run link
npm run restart
```


## Teststatus schreiben
```shell
npm run set:working
npm run set:idle
npm run set:waiting
npm run set:error
npm run set:offline
```



## Statusdatei

Pfad: `C:\Users\JuriDerewjanko\.agent-status.json`

Beispiel:
```json
{
  "agent": "Claude",
  "state": "working",
  "message": "coding",
  "updatedAt": "2026-06-30T12:00:00.000Z"
}
```

Erlaubte States:
```text
idle
working
waiting
error
offline
```

## Stream Deck App

Action suchen unter:

Development -> Agent Status

Dann auf eine Taste ziehen.

## Logs

Stream Deck App Logs: `%APPDATA%\Elgato\StreamDeck\logs\`

Plugin Logs liegen normalerweise über die Stream Deck App Logs und bei aktivem Debugging im Stream Deck Logsystem.

## Wichtig

Dieses Plugin nutzt nicht HID.
Dieses Plugin spricht nicht direkt mit der Hardware.
Dieses Plugin läuft über das offizielle Elgato Stream Deck SDK.


Wenn es knallt: diese Logs holen
`explorer $env:APPDATA\Elgato\StreamDeck\logs`

Und zusätzlich:

```shell
npm run validate
npm run build
```

Die Ausgaben davon sind dann die nächsten Fehlerquellen.