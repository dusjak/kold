# kold

kold er en personlig oversikt for egne gullhandler. Appen leser CSV-loggen fra Expert Advisor på din maskin. Oversikt viser resultat, boter og åpne posisjoner. Historikk viser treffprosent, grunner til at et oppsett ble hoppet over, sendefeil og lukkede handler.

Versjon 1 er kun til eget bruk. kold logger ikke inn hos megler, lagrer ikke passord og sender ingen ordre. Den leser bare.

## Kom i gang

Du trenger Node.js 22 og pnpm.

```bash
pnpm install
pnpm dev
```

Åpne [http://localhost:3000](http://localhost:3000). Uten videre oppsett viser kold en oppdiktet eksempellogg fra `fixtures/ea-log-sample.csv`.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Lys og mørk følger systemet. Fornavnet i hilsenen står i `src/config/oversikt.ts` og er Dusan som standard.

## Logg fra MT4

EA skriver en CSV i filmappen til terminalen. På Windows ligger den vanligvis her:

```text
C:\Users\<bruker>\AppData\Roaming\MetaQuotes\Terminal\<terminal-id>\MQL4\Files
```

Hvis filen skrives til den delte filmappen, ligger den under `Terminal\Common\Files`.

Kjør kold på samme maskin. Kopier `.env.example` til `.env` og sett mappen:

```text
LOG_DIR=C:\Users\<bruker>\AppData\Roaming\MetaQuotes\Terminal\<terminal-id>\MQL4\Files
```

Start appen på nytt etter at `.env` er endret. kold leser `*.csv` som ligger direkte i mappen, inntil 20 filer og 2 MB hver. Filene blir på maskinen. De lastes ikke opp noe sted.

Du kan også trykke Les logg og velge en CSV. Filen leses i nettleseren og lagres ikke.

Loggen kan ha kolonner som `time`, `event`, `symbol`, `magic`, `comment`, `ticket`, `side`, `volume`, `price`, `profit`, `reason` og `detail`. Ukjente kolonner og hendelser beholdes. Oversikten bruker blant annet `APPROVED`, `OPEN`, `CLOSE`, `SKIP_*`, `SEND_ERROR`, `DEINIT` og `SUMMARY`. Ordrekommentaren i eksempelet er `M15_M1_Trend_v1`. Magic number er et tall i loggen, ikke et kontonummer.

Bruk en mappe som bare inneholder denne loggen, eller last opp den ene filen. Andre CSV-filer i samme mappe blir lest med.

## Tall

Tall følger hovedbokreglene fra designet. De står i IBM Plex Mono, høyrestilt i tabellen, med norsk format: tynt mellomrom som tusenskille, komma som desimal, ekte minus, og kr etter beløpet. Blått er aksent. Grønt er gevinst. Lyng er tap.

Knappfargen styres av `--btn-bg`, `--btn-fg` og `--hero-fg` i `src/styles/tokens.css`. Standard er Alt A. Alt B er de to linjene som står i kommentaren der.

## Dette repoet er offentlig

Ikke legg inn strategikode, `.mq4`, `.ex4`, ekte CSV-logger, kontonummer, passord eller API-nøkler. Strategikode hører hjemme i et privat repo. `.gitignore` utelukker disse filene. Den eneste CSV-filen som skal ligge her, er den oppdiktede eksempelloggen.

## Utenfor versjon 1

Meglerinnlogging, bot-butikk, oppsettflyt og handel for andre er ikke med.
