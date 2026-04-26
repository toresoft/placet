# Placet — Libreria di validazione per business logic

> Documento di design. Fissa la semantica e le decisioni prese prima di procedere all'implementazione. Da aggiornare quando una decisione cambia.

**Nome del progetto:** Placet
**Pacchetto npm:** `@toresoft/placet`
**Stato:** 1.1 (design freeze, revisione completa)
**Ultimo aggiornamento:** Aprile 2026

---

## 0. Nome e pacchetto

**Placet** (latino: "piace", "è gradito") era la formula con cui, nelle assemblee deliberative storiche — concili, senati, corpi accademici — si esprimeva l'approvazione formale di una proposta. L'opposto era *non placet*.

Il nome riflette l'essenza della libreria: un valore viene sottoposto a un insieme di regole e riceve, al termine, un *placet* (approvazione) o un *non placet* (rifiuto con motivazione). Non si trasforma, non si reinterpreta, non si ritipizza: si valuta secondo regole esplicite e si pronuncia un verdetto strutturato.

Il nome è inoltre coerente con il dominio applicativo tipico della libreria — validazioni di regole di business in contesti formali, spesso amministrativi — dove il concetto di "approvazione conforme a regole" è centrale.

Il pacchetto è pubblicato come `@toresoft/placet` sotto lo scope personale dell'autore. Lo scope è riservato a librerie dello stesso autore, coerenti per filosofia (piccole, focalizzate, senza dipendenze non necessarie) e potrà ospitare in futuro librerie satellite di Placet — ad esempio pacchetti di constraint specializzati per domini applicativi specifici — o altre librerie indipendenti.

---

## 1. Vision e scope

Placet fornisce un **motore di validazione orientato alla business logic** per applicazioni Node.js scritte in TypeScript. Non si occupa di validazione strutturale/sintattica (tipo, shape, parsing): assume che il dato in ingresso sia già della forma corretta e del tipo dichiarato. Il suo unico compito è verificare **invarianti di dominio** applicando un insieme di regole (constraint) a un valore.

L'obiettivo non è competere con Zod, Valibot o class-validator nel loro territorio (parsing e type inference di dati esterni). L'obiettivo è occupare uno spazio distinto: la validazione di regole di business su dati già strutturati, tipicamente server-side, con constraint che possono avere dipendenze esterne e logica asincrona.

## 2. Posizionamento

Placet si colloca **dopo** il layer che garantisce la correttezza strutturale del dato. In una tipica pipeline server:

1. Il dato arriva da fuori (HTTP body, message queue, file).
2. Un layer di parsing/validazione strutturale (Zod, ajv, o parser custom) garantisce che il dato abbia la forma attesa e lo produce con il tipo TypeScript corretto.
3. **Placet** verifica che il dato rispetti le regole di business del dominio (unicità, coerenza cross-field, vincoli con stato esterno, autorizzazioni).

Di conseguenza, il metodo di validazione riceve un valore **già tipato** (`T`), non `unknown`. Placet non fa type narrowing, non trasforma il dato, non ne altera la struttura.

## 3. Principi architetturali

La libreria fa una cosa sola e la fa bene: orchestrare l'esecuzione di constraint su dati tipati. Tutto il resto (caching, accesso a dati esterni, i18n, logging) è responsabilità del chiamante o di librerie satellite.

Niente dependency injection integrata. I constraint sono classi istanziabili che ricevono le proprie dipendenze nel costruttore; il chiamante decide come costruirle (manualmente, con un container DI, con una factory). La libreria non conosce né impone nessun meccanismo di DI.

Niente decoratori. L'API è costituita da factory function e classi esplicite. Questo evita il debito tecnico di `experimentalDecorators`/`reflect-metadata` e rende la libreria utilizzabile in qualunque ambiente moderno (edge runtime, worker, serverless).

Async-first. L'API di validazione è interamente asincrona; i constraint sincroni sono un caso degenere di constraint asincroni.

Separazione tra piano dei tipi e piano del runtime. Il sistema di tipi garantisce che uno schema sia coerente con il tipo TypeScript del dato da validare. Il runtime esegue la validazione. Le due cose sono indipendenti e testabili separatamente.

## 4. Concetti del modello

### 4.1 Schema

Lo **schema** è l'elemento che descrive come validare un dato. Ogni valore di dominio ha un suo schema, scritto come istanza di una delle classi concrete derivate da una base comune.

La gerarchia degli schema è:

- `PrimitiveSchema<T>`: per tutti i primitivi TypeScript (`string`, `number`, `boolean`, `bigint`, `Date`, etc.). Contiene una lista di constraint applicati direttamente al valore.
- `ObjectSchema<T>`: per oggetti con forma nota. Contiene una lista di **constraint globali** (applicati all'oggetto nel suo complesso — tipicamente validazioni cross-field) e una mappa di schemi per ogni proprietà. I constraint globali ricevono in `value` l'intero oggetto; in questo caso `ctx.parent` è il contenitore dell'oggetto (l'oggetto padre, o `undefined` se l'oggetto è al top-level).
- `ArraySchema<T>`: per array omogenei. Contiene una lista di **array constraint** (applicati all'array nel suo complesso: cardinalità, unicità, ordinamento, ecc.) e un **itemSchema** unico applicato a ciascun elemento. I constraint dell'array ricevono in `value` l'intero array; in questo caso `ctx.parent` è il contenitore dell'array. Il caso in cui elementi diversi dell'array richiedono schema diversi si risolve componendo `array(conditional(...))`: l'itemSchema è un conditional che sceglie, per ogni elemento, lo schema giusto in base al contesto e al valore. Non esiste un "secondo piano" di constraint per item separato dall'itemSchema: i constraint che valgono per ogni elemento fanno parte dello schema dell'item.
- `ConditionalSchema<T>`: schema router che seleziona a runtime quale sotto-schema applicare, in base a un selector puro e sincrono. Dettagliato nella sezione 6.
- `OptionalSchema<T>`: wrapper che avvolge un altro schema rendendolo applicabile anche al valore `undefined`. Il tipo risultante è `T | undefined`. Quando il valore è `undefined`, l'inner schema non viene invocato e la validazione passa silenziosamente. Dettagliato in 4.1.1.
- `NullableSchema<T>`: wrapper analogo a `OptionalSchema`, ma per il valore `null`. Il tipo risultante è `T | null`. Dettagliato in 4.1.1.

I constraint globali (di `ObjectSchema` e `ArraySchema`) sono oggetti `ConstraintInterface` ordinari, con lo stesso contratto definito in 4.2. L'unica particolarità è il tipo del valore che ricevono (l'intero oggetto o array) e il fatto che `parent` punta al contenitore della struttura composta, non a uno dei suoi elementi interni.

Tipi aggiuntivi previsti ma non necessariamente nel primo rilascio:

- `TupleSchema`: array a forma fissa, con uno schema per posizione. È un caso distinto da `ArraySchema` e non è una sua variante: le tuple hanno elementi di tipi potenzialmente diversi in posizioni fisse, mentre gli array hanno elementi omogenei in numero variabile.
- `RecordSchema`: oggetto con chiavi dinamiche tutte dello stesso tipo.
- `SetSchema`: collezione senza ordine, unicità intrinseca.

Ogni schema porta nel suo tipo generico `T` il tipo TypeScript del dato che valida. Il sistema di tipi impedisce al momento della costruzione dello schema di associare un constraint al tipo sbagliato, dove possibile.

**Convenzione di naming.** Ogni schema della gerarchia è accessibile in due forme: una classe in PascalCase (es. `ObjectSchema`, `ConditionalSchema`) e una factory function in lowercase (es. `object`, `conditional`). La factory è l'API d'uso pubblica e idiomatica; la classe è esposta per casi avanzati (sottoclassing, introspezione, instanceof check). Questa convenzione vale per tutti gli schema: `PrimitiveSchema`/`primitive`, `ObjectSchema`/`object`, `ArraySchema`/`array`, `ConditionalSchema`/`conditional`, `OptionalSchema`/`optional`, `NullableSchema`/`nullable`.

#### 4.1.1 Optional e Nullable come wrapper schema

`optional` e `nullable` sono factory che producono wrapper schema: prendono uno schema esistente e ne producono uno nuovo con semantica estesa. Questo li rende cittadini di prima classe della gerarchia, sullo stesso piano di `conditional` e `lazy`, e uniforma il modello: ogni operazione sugli schema è una funzione che prende schema e produce schema.

**Semantica distinta.** I due modificatori coprono concetti diversi, ed è importante non confonderli:

- `optional(schema)`: il valore può essere `undefined`, o — quando lo schema è applicato a una proprietà di un oggetto — la proprietà può essere completamente assente. Il tipo risultante è `Schema<T | undefined>`, corrispondente al pattern `{ x?: T }` o `{ x: T | undefined }` in TypeScript (con `exactOptionalPropertyTypes` la differenza tra i due è rilevante e va presa in considerazione nell'implementazione).
- `nullable(schema)`: il valore può essere esplicitamente `null`. Il tipo risultante è `Schema<T | null>`. Una proprietà `nullable` deve comunque essere presente nell'oggetto: `null` è un valore, `undefined` è assenza.

**Combinabilità.** I due wrapper sono componibili senza limiti. `optional(nullable(schema))` e `nullable(optional(schema))` producono entrambi `Schema<T | null | undefined>`; l'ordine di composizione non cambia la semantica. Questo è tipico di API REST che accettano sia "campo assente" sia "campo esplicitamente null" come rappresentazioni equivalenti di un valore mancante.

**Short-circuit della validazione.** Quando il wrapper riconosce il valore modificatore (`undefined` per optional, `null` per nullable), l'inner schema non viene invocato: i constraint interni non hanno senso su un valore assente o null, e invocarli produrrebbe errori spuri. Questo comportamento è parte della semantica del wrapper e non è configurabile.

**Riconoscimento selettivo.** Ogni wrapper riconosce **solo** il proprio valore modificatore: `optional` short-circuita solo su `undefined`, `nullable` solo su `null`. Un `optional(schema)` invocato con `null` passa `null` all'inner schema, che probabilmente lo rifiuterà; simmetricamente `nullable(schema)` con `undefined` passa `undefined` all'inner. Per accettare entrambi i valori modificatori si compongono i wrapper: `optional(nullable(schema))` produce `Schema<T | null | undefined>` e short-circuita su entrambi.

**Riusabilità.** Un beneficio architetturale dei wrapper come funzioni è che lo stesso schema base può essere riusato in contesti required e optional senza duplicazione:

```
const phoneSchema = primitive(new PhoneFormat());

const contactSchema = object({
  primary: phoneSchema,              // required
  secondary: optional(phoneSchema),  // stesso schema base, reso optional qui
});
```

Lo schema base resta immutabile; il wrapper produce una nuova istanza con semantica estesa.

### 4.2 Constraint

Un **constraint** è una regola di validazione applicabile a un valore. È un oggetto che implementa l'interfaccia `ConstraintInterface<T>`, dove `T` è il tipo (o union di tipi) che il constraint sa gestire.

**Contratto.**

Ogni constraint concreto dichiara:

- Un **codice identificativo** stabile (campo `code`) che identifica il constraint nel sistema. Stringa costante, tipicamente UPPER_SNAKE_CASE (es. `'EMAIL'`, `'CIG_VALIDATOR'`, `'MIN_VALUE'`).
- L'**insieme dei codici di errore** che il constraint può produrre (campo `errorCodes`). Array di stringhe costanti che enumera tutte le violazioni concettualmente distinte gestite dal constraint. Vedi sotto per la convenzione di naming e per l'uso in introspezione/dev-mode check.
- I **tipi di dato gestiti** a livello di type system: il generic `T` dell'interfaccia vincola il tipo accettato a compile-time e impedisce al compilatore di accettare `primitive<number>(new Email())` dove `Email` gestisce `string`.
- I **tipi di dato gestiti** a livello runtime: il campo `handledTypes` è un array di `TypeKind` usato dall'engine per check difensivi e introspezione. I `TypeKind` sono un'enumerazione chiusa: `'string' | 'number' | 'boolean' | 'bigint' | 'date' | 'object' | 'array' | 'any'`.
- I **gruppi di validazione** a cui appartiene il constraint, esposti come campo `groups` di sola lettura. Convenzione: il chiamante li passa come opzione del costruttore (`{ groups?: readonly string[] }`); un constraint senza gruppi dichiarati ha `groups` valorizzato all'array vuoto ed è considerato attivo per tutte le invocazioni (indipendentemente dai gruppi attivi nel context).
- Un metodo `validate(value, context)` **asincrono** che esegue la validazione. Il metodo non ritorna nulla: registra gli errori via `context.addError(violation)`. Un constraint che non registra errori è considerato passato.

**Contratto:**

```
interface ConstraintInterface<T = unknown> {
  readonly code: string;
  readonly errorCodes: readonly string[];
  readonly handledTypes: readonly TypeKind[];
  readonly groups: readonly string[];

  validate(value: T, context: MutableValidationContext): Promise<void>;
}
```

L'interfaccia è il **contratto pubblico**. Non prescrive un costruttore: ogni implementazione concreta è libera di definirne uno coerente con le proprie dipendenze. L'engine accetta qualunque oggetto che soddisfi l'interfaccia, indipendentemente dalla classe da cui proviene.

Per evitare il boilerplate ripetitivo del campo `groups` (dichiarazione + assegnazione da `options.groups ?? []` nel costruttore), Placet fornisce una classe astratta opzionale `AbstractConstraint<T>` che implementa l'interfaccia con il default `groups = []` e accetta `{ groups?: readonly string[] }` dal costruttore. Estenderla è una **scorciatoia, non un obbligo**: i constraint nei seguenti esempi sono mostrati con implementazione diretta dell'interfaccia per chiarezza del contratto.

**Convenzione di naming degli `errorCode`.** Gli errorCode seguono la forma `<CONSTRAINT_CODE>.<ERROR_NAME>`, dove `<CONSTRAINT_CODE>` coincide con il `code` del constraint e `<ERROR_NAME>` è una stringa UPPER_SNAKE_CASE che descrive la violazione specifica (es. `'EMAIL.FORMAT_INVALID'`, `'CIG_VALIDATOR.CHECKSUM_INVALID'`, `'MIN_VALUE.VIOLATED'`). Questa convenzione produce identificatori leggibili, greppabili nel codebase, gerarchicamente organizzati, e adatti come chiavi i18n (`errors.EMAIL.FORMAT_INVALID`).

**Identificatori opachi (UUID, hash) sono sconsigliati.** Riducono la leggibilità nei log, non sono greppabili, complicano i18n e introducono frizione di scrittura senza risolvere un problema reale: la coppia `(constraintCode, errorCode)` esposta in `ValidationError` è già unica per costruzione all'interno del sistema. Per uniqueness cross-package, Placet 1.0 si affida alla convenzione di prefisso `<CONSTRAINT_CODE>.` — sufficiente nei contesti applicativi tipici.

**Uso del campo `errorCodes`.** Tre scopi:

1. **Introspezione** — tooling esterno può estrarre dall'albero degli schema il catalogo completo dei codici di errore producibili, utile per generare tabelle i18n, documentazione, dashboard di osservabilità.
2. **Dev-mode check** — l'engine, in modalità sviluppo, può verificare che ogni `addError({ errorCode })` invocato da un constraint usi un codice presente nel suo `errorCodes` dichiarato; un codice non dichiarato è un bug del constraint e va segnalato (warning o eccezione, configurabile). In produzione il check è disabilitato per non pagare overhead.
3. **Auto-documentazione** — leggendo la classe del constraint si conoscono immediatamente tutti i possibili esiti di validazione che produce.

**Esempio — constraint mono-tipo senza dipendenze:**

```
class Email implements ConstraintInterface<string> {
  readonly code = 'EMAIL';
  readonly errorCodes = ['EMAIL.FORMAT_INVALID'] as const;
  readonly handledTypes = ['string'] as const;
  readonly groups: readonly string[];

  constructor(options?: { groups?: readonly string[] }) {
    this.groups = options?.groups ?? [];
  }

  async validate(value: string, ctx: MutableValidationContext): Promise<void> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      ctx.addError({ errorCode: 'EMAIL.FORMAT_INVALID' });
    }
  }
}
```

**Esempio — constraint multi-tipo (concettualmente correlati):**

```
class MinValue implements ConstraintInterface<number | bigint | Date> {
  readonly code = 'MIN_VALUE';
  readonly errorCodes = ['MIN_VALUE.VIOLATED'] as const;
  readonly handledTypes = ['number', 'bigint', 'date'] as const;
  readonly groups: readonly string[];

  constructor(
    private readonly min: number | bigint | Date,
    options?: { groups?: readonly string[] },
  ) {
    this.groups = options?.groups ?? [];
  }

  async validate(value: number | bigint | Date, ctx: MutableValidationContext): Promise<void> {
    if (value < this.min) {
      ctx.addError({ errorCode: 'MIN_VALUE.VIOLATED', params: { min: this.min, actual: value } });
    }
  }
}
```

**Esempio — constraint stateful con dipendenza:**

```
class UniqueEmail implements ConstraintInterface<string> {
  readonly code = 'UNIQUE_EMAIL';
  readonly errorCodes = ['UNIQUE_EMAIL.ALREADY_TAKEN'] as const;
  readonly handledTypes = ['string'] as const;
  readonly groups: readonly string[];

  constructor(
    private readonly users: UserRepository,
    options?: { groups?: readonly string[] },
  ) {
    this.groups = options?.groups ?? [];
  }

  async validate(value: string, ctx: MutableValidationContext): Promise<void> {
    const existing = await this.users.findByEmail(value);
    if (existing) {
      ctx.addError({ errorCode: 'UNIQUE_EMAIL.ALREADY_TAKEN', params: { email: value } });
    }
  }
}
```

**Produzione di errori.** Il constraint registra errori via `context.addError(violation)`, dove `violation` ha shape:

```
ConstraintViolation {
  errorCode: string                    // codice dell'errore (obbligatorio)
  message?: string                     // messaggio (template o già formattato)
  params?: Record<string, unknown>     // parametri per i18n/formattazione
  cause?: unknown                      // error originale, per debug
  path?: string                        // override del path (vedi sotto)
}
```

Il constraint fornisce `errorCode` (sempre), e opzionalmente `message`, `params`, `cause`. L'engine **inietta automaticamente** il `path` del valore corrente e il `constraintCode` del constraint invocante, costruendo il `ValidationError` finale senza duplicazione di informazioni.

**Errori su path diverso dal corrente.** Il campo opzionale `path` in `ConstraintViolation` permette a un constraint di registrare un errore su un path diverso da quello in cui sta girando. Caso d'uso tipico: un constraint globale su un `ObjectSchema` che valida la coerenza tra due campi e vuole segnalare l'errore sul campo "sbagliato" (non sull'oggetto intero). Esempio:

```
class PasswordsMatch implements ConstraintInterface<{ password: string; confirmPassword: string }> {
  readonly code = 'PASSWORDS_MATCH';
  readonly errorCodes = ['PASSWORDS_MATCH.MISMATCH'] as const;
  readonly handledTypes = ['object'] as const;
  readonly groups: readonly string[];

  constructor(options?: { groups?: readonly string[] }) {
    this.groups = options?.groups ?? [];
  }

  async validate(value: { password: string; confirmPassword: string }, ctx: MutableValidationContext): Promise<void> {
    if (value.password !== value.confirmPassword) {
      ctx.addError({
        errorCode: 'PASSWORDS_MATCH.MISMATCH',
        path: `${ctx.path}.confirmPassword`,  // errore attribuito a confirmPassword
      });
    }
  }
}
```

Questa capacità riflette il pattern di Symfony Validator (`ExecutionContext.buildViolation(...).atPath(...)`). Il `path` dichiarato dal constraint sovrascrive quello calcolato automaticamente dall'engine.

**Istanziazione e composizione.** I constraint sono istanziati dal chiamante con le loro dipendenze e passati agli schema nel momento della costruzione. Esempio di composizione completa:

```
const userSchema = object({
  email: primitive(
    new NotBlank(),
    new Email({ groups: ['default'] }),
    new UniqueEmail(userRepository, { groups: ['signup'] }),
  ),
  age: primitive(new MinValue(18)),
});
```

Lo schema è un valore immutabile; i constraint sono immutabili (le loro dipendenze sono iniettate una volta al costruttore).

### 4.3 Validation Context

Il **context** è l'oggetto che accompagna l'esecuzione di una validazione. Contiene tutto ciò che un constraint o un selector può aver bisogno di sapere oltre al valore che sta validando, e (nel caso dei constraint) il canale per registrare errori.

Placet distingue due forme del context, con responsabilità diverse:

- **`ValidationContext`** (read-only): esposto ai *selector* dei conditional schema. Permette solo lettura di dati contestuali. Un selector è un puro router: non può e non deve registrare errori.
- **`MutableValidationContext`** (read + write): esposto ai *constraint* nel loro metodo `validate`. Estende `ValidationContext` aggiungendo il metodo `addError` per registrare violazioni nel risultato.

**Shape di `ValidationContext`:**

- `path`: percorso testuale che identifica la posizione corrente nel traversal, nella stessa sintassi del path query (sezione 4.3.2). Al top-level della validazione il path è `$`; per una proprietà al primo livello è `$.field`; per un elemento di array al primo livello è `$[0]`; per strutture più profonde le notazioni si compongono (`$.items[3].customer.name`). Il path è calcolato e propagato dall'engine.
- `root`: il valore top-level passato a `validate()`. Punto di riferimento per path query assoluti e per validazioni cross-field che devono confrontarsi con l'intero albero.
- `parent`: l'entità che contiene il dato corrente. Se il valore corrente è una proprietà di un oggetto, `parent` è quell'oggetto; se è un elemento di un array, `parent` è l'array; al top-level `parent` è `undefined`. Nota: quando si valida un `ObjectSchema` nel suo complesso (constraint globale sull'oggetto), il valore corrente è l'oggetto stesso e `parent` è il contenitore dell'oggetto (l'oggetto padre, o `undefined` se l'oggetto è al top-level).
- `location`: informazioni strutturali del punto corrente (vedi 4.3.1).
- `groups`: l'insieme dei gruppi di validazione attivi per l'esecuzione corrente.
- `custom`: slot opaco per l'utente. Qui il chiamante mette le sue dipendenze (repository, service, DataLoader, utente corrente, locale, tenant, ecc.). Placet non interpreta questo campo.
- `get(path)`: metodo per accedere a un valore nell'albero tramite path query (vedi 4.3.2).

**Shape di `MutableValidationContext`:**

Tutto ciò che è in `ValidationContext`, più:

- `addError(violation: ConstraintViolation): void`: registra un errore nel risultato della validazione in corso. La shape di `ConstraintViolation` è definita in 4.2 (sezione Constraint). L'engine inietta automaticamente `path` (se non fornito dal constraint) e `constraintCode`, completando le informazioni del `ValidationError` finale.

Un constraint può invocare `addError` zero, una o più volte in una singola esecuzione di `validate`, a seconda di quante violazioni concettualmente distinte ha riscontrato.

#### 4.3.1 Location strutturale

Il campo `location` espone le informazioni di posizione del valore corrente rispetto al suo contenitore immediato, in forma strutturata (non testuale come il `path`). Shape:

```
location {
  index?: number      // valorizzato se il valore è elemento di un array
  key?: string        // valorizzato se il valore è proprietà di un oggetto
}
```

Al top-level della validazione entrambi i campi sono `undefined`. Dentro un array, `index` è l'indice dell'elemento corrente. Dentro un oggetto, `key` è il nome della proprietà corrente.

Questa informazione è disponibile sia ai constraint sia ai selector dei conditional schema. È particolarmente utile nei selector che devono comportarsi diversamente in base alla posizione: ad esempio, "il primo elemento di un array ha regole diverse dagli altri" si esprime come un conditional il cui selector usa `ctx.location.index === 0`.

Il `path` testuale resta disponibile per logging, tracing e produzione di messaggi di errore; `location` è pensato per la logica decisionale perché non richiede parsing.

#### 4.3.2 Accesso al contesto via path query

Il context espone il metodo `get(path)` che accetta una stringa di path e restituisce il valore corrispondente nell'albero del dato validato. Permette ai constraint e ai selector di leggere valori da punti arbitrari senza propagare manualmente `root` e senza fare traversal manuale.

Placet definisce una sintassi propria — un sottoinsieme minimale ispirato a JSONPath, senza dipendenze esterne — orientata a un singolo scopo: accesso deterministico a percorsi letterali nell'albero. Non è un linguaggio di query: non supporta filtri, wildcard o logica. Logica e filtri vanno espressi in TypeScript dentro il constraint, non nella stringa del path.

**Sintassi.**

```
$                           root (valore top-level passato a validate)
$.field                     proprietà "field" della root
$.field1.field2             proprietà nested (dot separator tra identificatori)
$.items[0]                  elemento 0 dell'array "items"
$.items[0].sku              proprietà "sku" dell'elemento 0
$["field"]                  bracket notation per proprietà di oggetto
$["key.with.dots"]          bracket notation per chiavi con caratteri speciali
$["field"].sub              combinazione di notazioni
```

**Regole.**

- Il path **deve essere assoluto**: inizia sempre con `$`, che rappresenta la root. Placet non supporta percorsi relativi. Per accedere al valore corrente o al suo contenitore immediato si usano i campi dedicati del context (`parent`, `location.index`, `location.key`), che sono più chiari e type-safe di qualunque sintassi relativa.
- I separatori ammessi sono `.` tra identificatori JavaScript validi e `[...]` per indici numerici (interi non negativi) e chiavi stringa (racchiuse in virgolette doppie). La bracket notation con stringa è sempre disponibile come alternativa al dot, utile per chiavi con caratteri speciali (punti, trattini, spazi).
- **Percorsi inesistenti o interrotti ritornano `undefined`**, non lanciano eccezioni. La semantica è analoga all'optional chaining di JavaScript: se a un qualunque livello il valore è `null`, `undefined` o non contiene la chiave richiesta, il risultato complessivo è `undefined`. Un constraint che vuole distinguere "percorso assente" da "percorso presente con valore undefined" può confrontare esplicitamente il risultato.
- Indici negativi, wildcard, filtri, slicing e funzioni **non sono supportati**. Un tentativo di usarli produce un errore di parsing del path, non un'interpretazione alternativa.

**Tipo di ritorno.**

La firma è:

```
get(path: string): unknown
get<T>(path: string): T | undefined
```

La forma senza generic ritorna `unknown`: l'utente fa il type narrowing che deve fare comunque per un valore recuperato da un path costruito come stringa. La forma generica accetta un type parameter come *hint ergonomico non verificato*: `ctx.get<number>('$.user.age')` produce `number | undefined`, risparmiando un cast al chiamante, ma è responsabilità sua che il path punti davvero a un numero. Placet non verifica la conformità tra path e tipo generic.

**Esempi di uso tipico.**

```
// In un constraint cross-field:
class ConfirmPasswordMatch implements ConstraintInterface<string> {
  readonly code = 'CONFIRM_PASSWORD_MATCH';
  readonly errorCodes = ['CONFIRM_PASSWORD_MATCH.MISMATCH'] as const;
  readonly handledTypes = ['string'] as const;
  readonly groups: readonly string[];

  constructor(options?: { groups?: readonly string[] }) {
    this.groups = options?.groups ?? [];
  }

  async validate(value: string, ctx: MutableValidationContext): Promise<void> {
    const password = ctx.get<string>('$.password');
    if (value !== password) {
      ctx.addError({ errorCode: 'CONFIRM_PASSWORD_MATCH.MISMATCH' });
    }
  }
}

// In un selector di conditional:
const contractSchema = conditional({
  selector: (ctx, value) => ctx.get<string>('$.tipologiaContratto') ?? 'DEFAULT',
  cases: { 'QUADRO': quadroSchema, 'DIRETTO': direttoSchema, 'DEFAULT': fallback },
});
```

### 4.4 Validation Result e Error

Il risultato complessivo di una validazione ha shape:

```
ValidationResult {
  valid: boolean
  errors: ValidationError[]
  skipped: SkippedConstraint[]      // constraint non eseguiti (chain, gruppi, ...)
}

ValidationError {
  path: string                       // "$.order.items[0].cig"
  constraintCode: string             // "CIG_VALIDATOR"
  errorCode: string                  // "CIG_VALIDATOR.CHECKSUM_INVALID"
  message?: string                   // template o messaggio già formattato, se fornito dal constraint
  params?: Record<string, unknown>   // parametri per i18n/formattazione
  cause?: unknown                    // per debug (error originale)
}

SkippedConstraint {
  path: string
  constraintCode: string
  reason: "chain-previous-failed" | "group-mismatch" | "conditional-no-match" | ...
}
```

**Costruzione degli errori.** Un `ValidationError` è sempre costruito dall'engine, non dal constraint. Il constraint registra una `ConstraintViolation` (via `ctx.addError`, vedi 4.2) che contiene le informazioni che *solo lui* conosce: `errorCode`, eventuale `message`, `params`, `cause`, eventuale `path` di override. L'engine compone questa violazione con i dati che *lui* conosce — il `constraintCode` del constraint invocante e il `path` corrente del traversal — producendo il `ValidationError` finale.

Questa separazione riflette la separazione di responsabilità: il constraint descrive **cosa** non va, l'engine sa **dove** e **chi**.

**Identità dei campi.** Il `constraintCode` identifica univocamente il constraint che ha generato l'errore (il suo campo `code`). L'`errorCode` identifica quale delle possibili violazioni gestite dal constraint si è verificata, ed è una delle stringhe enumerate nel campo `errorCodes` del constraint. Questa separazione permette a un constraint di gestire più tipi di errore correlati mantenendo una tassonomia strutturata; per convenzione l'`errorCode` ha forma `<CONSTRAINT_CODE>.<ERROR_NAME>` (vedi 4.2).

Il messaggio può essere un template con parametri (formattazione esterna, responsabilità dell'integratore) o una stringa già formattata. Placet non fa i18n nel core; fornisce i dati strutturati necessari all'integratore per farla.

## 5. Composizione degli schema

Uno schema di dominio reale è un albero: un oggetto contiene campi, alcuni dei quali sono oggetti o array di oggetti, a loro volta potenzialmente composti. La leggibilità del codice che costruisce lo schema è un problema reale e strutturale — non risolvibile con un'invenzione di API, ma affrontabile con convenzioni di design e supporto del tool.

### 5.1 Schema come valori immutabili e componibili

In Placet uno schema è un valore immutabile, leggero, privo di side effect. Questo permette di trattarlo come un qualunque dato: assegnarlo a costanti, passarlo come argomento, restituirlo da funzioni. La costruzione dello schema avviene tramite factory function (`primitive`, `object`, `array`, `conditional`, ...) che producono istanze delle classi concrete della gerarchia `Schema`.

Le factory sono progettate per avere una sintassi corta e per accettare naturalmente sotto-schema pre-costruiti. Un `object({ address: addressSchema })` deve essere indistinguibile in leggibilità e type safety da un `object({ address: object({ ... }) })` inline.

### 5.2 Pratica raccomandata: estrazione di sotto-schema

Il pattern raccomandato per mantenere la leggibilità è l'**estrazione di sotto-schema in costanti nominate**, ricomposte nel punto d'uso. Questo è il pattern standard nelle librerie moderne (Zod, Valibot) e funziona bene anche in Placet.

Esempio: anziché costruire tutto in un'unica espressione profondamente annidata, si estraggono i sotto-schema in costanti con nome descrittivo:

```
const addressSchema = object({
  street: primitive(new NotBlank()),
  city: primitive(new NotBlank()),
  zip: primitive(new ZipCode()),
});

const customerSchema = object({
  name: primitive(new NotBlank()),
  vatNumber: primitive(new PartitaIVA()),
  address: addressSchema,
});

const orderSchema = object({
  cig: primitive(new CIGValidator()),
  customer: customerSchema,
  items: array(itemSchema),
});
```

I vantaggi sono: leggibilità (ogni schema sta in poche righe), testabilità (ogni sotto-schema può avere i suoi test isolati), riusabilità (lo stesso `addressSchema` può essere usato in più aggregati).

La documentazione e gli esempi della libreria adottano sempre questo stile, per insegnare la convenzione tramite cultura, non tramite imposizione dell'API.

### 5.3 Ricorsione

Uno schema che referenzia sé stesso (albero di categorie, struttura organizzativa con figli, commenti annidati) non può essere costruito come `const` semplice: al momento della dichiarazione lo schema non esiste ancora.

Placet fornisce una factory `lazy(getter)` che accetta una funzione che ritorna lo schema; il getter è invocato solo al momento dell'uso, quando la costante è già stata definita:

```
const categorySchema: Schema<Category> = object({
  name: primitive(new NotBlank()),
  children: array(lazy(() => categorySchema)),
});
```

A livello di tipi, l'utente annota esplicitamente il tipo della costante (in linea con quanto fanno Zod e le altre librerie per i tipi ricorsivi, dato che TypeScript non può inferirli automaticamente in casi ricorsivi).

### 5.4 Registry di schema come pattern opzionale

Per progetti grandi con molti schema interrelati, la gestione "a costanti nominate" può diventare scomoda: dichiarazioni in ordine forzato, difficoltà di ispezione globale, difficoltà di naming coerente. Placet **non fornisce un registry nel core** ma riconosce il pattern come valido e ne documenta l'implementazione. Può essere oggetto di un pacchetto satellite (es. `@toresoft/placet-registry`).

Un registry permette di dichiarare schema per nome e risolverli per riferimento, gestendo automaticamente la ricorsione e l'ordine di dichiarazione. È una funzionalità *additiva* che non impatta sul design del core.

## 6. Condizionalità

Placet distingue due meccanismi di condizionalità diversi, che risolvono problemi diversi e non vanno confusi:

- I **gruppi** filtrano quali *constraint* sono eseguiti all'interno di uno schema.
- La **selezione condizionale di schema** sceglie *quale schema* applicare a un dato campo o valore.

Sono dimensioni ortogonali: un conditional schema seleziona uno schema; lo schema selezionato contiene constraint che, a loro volta, possono essere filtrati dai gruppi.

### 6.1 Validation groups

Un constraint può dichiarare uno o più **gruppi** a cui appartiene, tramite il parametro `groups` del costruttore. L'engine riceve l'insieme dei gruppi attivi per l'esecuzione corrente (via `options.groups` del metodo `validate` e propagato nel context come `ctx.groups`) ed esegue solo i constraint il cui insieme di gruppi interseca quello attivo.

**Constraint senza gruppo dichiarato.** Un constraint che non dichiara alcun gruppo (array `groups` vuoto) è considerato **attivo per qualunque invocazione**, indipendentemente dai gruppi passati a `validate`. Questa è la scelta di default esplicita: senza gruppi dichiarati, il constraint viene sempre eseguito. Non esiste un gruppo `default` implicito che genererebbe ambiguità.

**Default di `options.groups`.** Il default di `options.groups` è l'array vuoto `[]`. La semantica conseguente, derivata direttamente dalla regola di intersezione, è: vengono eseguiti **solo i constraint senza gruppi dichiarati**, mentre tutti i constraint che dichiarano almeno un gruppo sono saltati (registrati in `skipped[]` con reason `group-mismatch`). Questa è una scelta esplicita e va tenuta presente: il default non significa "esegui tutto", significa "esegui solo le regole non gruppate". Per eseguire constraint gruppati il chiamante deve passare esplicitamente i gruppi attivi (`{ groups: ['signup'] }`).

I gruppi filtrano i constraint: non selezionano schemi, non modificano la struttura. Sono un metadato applicato alla singola regola di validazione.

Esempi di uso: validare una `Gara` con regole diverse per stato "bozza" (minime), "pubblicazione" (stringenti + check ANAC), "archivio" (sola integrità). Ogni constraint dichiara a quali stati si applica, l'engine attiva i gruppi corrispondenti al momento della validazione.

### 6.2 Selezione condizionale di schema

Per i casi dove il valore da validare può avere forme diverse a seconda del contesto o del suo stesso contenuto (union discriminate, scelta dello schema basata su runtime state), Placet fornisce una factory `conditional` che produce uno schema router.

**Forma dichiarativa a mappa.** Il conditional è espresso come una funzione *selector* che ritorna una chiave, più una mappa di chiavi → schema:

```
const contractSchema = conditional({
  selector: (ctx, value) => value.type,
  cases: {
    'QUADRO': quadroContractSchema,
    'DIRETTO': direttoContractSchema,
    'ACCORDO_QUADRO': accordoQuadroSchema,
  },
  default: genericContractSchema,   // opzionale
});
```

Il selector è una funzione che riceve il context corrente e il valore da validare, e restituisce una chiave presente nella mappa `cases`. Lo schema selezionato è poi applicato al valore.

**Signature del selector.** Il selector riceve `(ctx, value)`:

- `ctx`: il `ValidationContext` corrente (forma read-only, come descritto in 4.3). Include `path`, `root`, `parent`, `location`, `groups`, `custom`. Particolarmente utile `ctx.location` per selector che devono decidere in base alla posizione del valore (es. "il primo elemento di un array ha regole diverse dagli altri": `selector: (ctx, value) => ctx.location.index === 0 ? 'HEAD' : 'TAIL'`).
- `value`: il valore correntemente oggetto di validazione, già del tipo atteso. Se il conditional è al top-level, `value` coincide con il valore passato a `engine.validate`; se è annidato (proprietà di oggetto, elemento di array, dentro un altro conditional), `value` è il valore a quel punto del traversal.

**Regole del conditional:**

- **Selector puro e sincrono**: il selector non deve avere side effect, non deve essere asincrono, non deve fare chiamate costose. È una semplice funzione di routing. Validazioni che richiedono I/O o logica complessa appartengono a constraint, non al selector.
- **Mappa esclusiva**: per ogni chiave ritornata dal selector, esattamente un caso matcha. Non c'è merge di schema, non c'è fallback fuzzy.
- **No match è un errore**: se il selector ritorna una chiave che non è nella mappa e non è stato fornito un `default`, la validazione fallisce con un errore esplicito (tipo `CONDITIONAL_NO_MATCH`). Un `default` esplicito fornisce il fallback quando lo si vuole.
- **Niente constraint globali**: il conditional è un puro router. Eventuali constraint che valgono "in ogni caso" vanno inseriti negli schema figli (o estratti come sotto-schema comune e composti).
- **Cittadinanza piena**: `conditional()` produce uno `Schema<T>` usabile ovunque — come schema di proprietà, di elementi di array, top-level, o dentro un altro conditional.

**Tipo risultante.** Il tipo prodotto dal conditional è l'**unione** dei tipi dei casi: se `cases.A: Schema<A>` e `cases.B: Schema<B>`, il risultato è `Schema<A | B>`. Placet non tenta di riprodurre il narrowing delle discriminated union di TypeScript — e non ne ha bisogno: il chiamante conosce già il tipo del valore che passa a `validate`, il conditional è solo un meccanismo di routing a runtime.

### 6.3 Come i due meccanismi cooperano

Gruppi e conditional operano su piani separati e componibili:

```
engine.validate(order, orderSchema, {
  custom: { ... },
  groups: ['published', 'anac-strict'],
});
```

Il traversal dell'engine incontra il campo `contract` il cui schema è un conditional: il selector valuta `order.type === 'QUADRO'` e seleziona `quadroContractSchema`. Entrando in quel sotto-schema, l'engine applica i constraint dichiarati, filtrando via quelli il cui gruppo non è tra `['published', 'anac-strict']`. Il conditional ha scelto *cosa* applicare, i gruppi hanno filtrato *quali regole dentro ciò che è stato scelto*. Le due decisioni sono indipendenti.

## 7. Strategia di esecuzione

### 7.1 API dell'engine

L'engine è esposto come classe `ValidationEngine` da istanziare esplicitamente. Non esistono istanze globali, singleton o funzioni libere di shortcut: l'istanziazione è l'unica forma di uso.

```
import { ValidationEngine } from '@toresoft/placet';

const engine = new ValidationEngine(/* options future */);
const result = await engine.validate(value, schema, options);
```

**Perché solo la classe.** Incapsulare la validazione in una classe permette di evolverla con configurazione senza rompere il contratto pubblico (opzioni di default, hook, formatter di errori, abort-early globale, ecc. possono essere aggiunti come parametri del costruttore in un momento successivo). Non esporre una funzione libera di shortcut evita dualità nell'API e forza a una sola via canonica di uso.

**Signature di `validate`:**

```
validate<T>(
  value: T,
  schema: Schema<T>,
  options?: ValidateOptions<Ctx>,
): Promise<ValidationResult>

ValidateOptions<Ctx> {
  groups?: readonly string[]           // gruppi attivi; default: [] (vedi 6.1 per la semantica)
  custom?: Ctx                         // slot opaco propagato nel context
}
```

`value` è già tipato (`T`) — Placet assume che il chiamante abbia garantito il tipo in un layer precedente. `schema` è uno `Schema<T>` coerente con il tipo del valore. `options` contiene configurazione della singola invocazione.

Il metodo ritorna sempre una `Promise<ValidationResult>`: non lancia eccezioni per errori di validazione (gli errori di validazione sono dati, non eccezioni). Un'eccezione sollevata dal metodo indica un bug di programmazione (constraint che lancia inaspettatamente, schema malformato, ecc.) ed è trattata come tale.

### 7.2 Async-first

Tutte le operazioni di validazione sono asincrone. `engine.validate(value, schema, options?)` restituisce `Promise<ValidationResult>`. I constraint sincroni implementano il metodo `validate` senza `await` ma la libreria li tratta uniformemente come async.

### 7.3 Parallelismo e sequenza

Il default è:

- Le proprietà di un `ObjectSchema` sono validate in **parallelo** tra loro.
- Gli elementi di un `ArraySchema` sono validati in **parallelo** tra loro.
- I constraint su uno stesso target (stesso campo o stesso schema globale) sono eseguiti in **parallelo** tra loro, di default.

Il comportamento di default è quindi "tutto parallelo" e "tutti i constraint vengono eseguiti indipendentemente": se la validazione di lunghezza di una password fallisce, la validazione di presenza caratteri speciali va eseguita comunque, perché sono informazioni indipendenti utili all'utente finale.

### 7.4 Chain constraint

Per i casi dove i constraint hanno una dipendenza sequenziale (il secondo ha senso di girare solo se il primo è passato), Placet fornisce un **aggregatore di chain** che raggruppa N constraint dichiarando "questi vanno in sequenza, short-circuit al primo fallimento". Esempio concettuale:

```
chain([
  new CIGFormat(),        // se fallisce, CIGExistsInANAC non viene eseguito
  new CIGExistsInANAC(anacClient),
])
```

L'aggregatore è a sua volta un constraint (implementa lo stesso contratto `ConstraintInterface<T>`): può essere annidato, mescolato con constraint normali, trattato in modo omogeneo dall'engine.

**Implementazione interna.** Per decidere se proseguire dopo ogni constraint della sequenza, la chain isola internamente l'esecuzione tramite un sub-context: ogni constraint della catena gira su un context derivato dedicato, che accumula le eventuali violazioni separatamente. Dopo l'invocazione, la chain ispeziona il sub-context: se sono state registrate violazioni, le travasa nel context padre e interrompe la sequenza registrando come `skipped` i constraint successivi; altrimenti procede al constraint successivo. Il constraint incapsulato dalla chain non sa di esserci: vede un `MutableValidationContext` standard.

### 7.5 Skip e propagazione

Quando un constraint non viene eseguito (per dipendenza fallita dentro una chain, per non-matching dei gruppi attivi, o per altre ragioni future), il fatto è registrato nel `skipped[]` del risultato con il motivo. Questo dà all'integratore visibilità completa sull'esecuzione, utile per debug, logging, e per distinguere "validazione passata" da "validazione non eseguita".

## 8. Dipendenze esterne e caching

La libreria **non gestisce il caching** delle chiamate esterne fatte dai constraint. Questa è responsabilità dell'integratore, che deve configurare il repository o il service client con le sue strategie di cache, batching, retry.

Dove il caching naturale non è possibile o non è sufficiente (es. validazione di un array di 100 elementi dove ciascuno fa una query con la stessa chiave risultando in 100 round-trip), la libreria **consiglia il pattern DataLoader** come soluzione standard. DataLoader non è una dipendenza del core: è un pattern documentato che l'utente può usare inserendo i loader nello slot `custom` del context.

Esempio di pattern consigliato:

```
// Setup applicativo:
const cigLoader = new DataLoader(cigs => anacClient.batchLookup(cigs));

// Chiamata:
engine.validate(order, orderSchema, {
  custom: { cigLoader, userRepo, currentUser },
  groups: ['published'],
});

// Nel constraint:
class CIGExists {
  async validate(value, ctx) {
    const result = await ctx.custom.cigLoader.load(value);
    // ...
  }
}
```

Il core resta agnostico rispetto al meccanismo. La documentazione fornirà esempi concreti.

## 9. Tipi di dato supportati

Nel primo rilascio:

- Tutti i primitivi TypeScript: `string`, `number`, `boolean`, `bigint`, `Date`, `null`, `undefined`.
- `ObjectSchema` per oggetti con forma nota.
- `ArraySchema` per array omogenei.
- `conditional` per selezione runtime di schema.
- `optional` e `nullable` come wrapper per modificatori strutturali.
- `lazy` per schema ricorsivi.

Previsti in rilasci successivi:

- `TupleSchema` per array a forma fissa con tipi diversi per posizione.
- `RecordSchema` per oggetti con chiavi dinamiche.
- `SetSchema` per collezioni senza ordine.

L'architettura dell'engine deve essere estendibile a nuovi tipi di schema senza rompere il contratto pubblico.

## 10. Fuori scope

Per chiarezza, Placet **non** fa le seguenti cose, e non le farà:

- Parsing di dati non tipati / type narrowing / type coercion.
- Trasformazione dei dati durante la validazione (niente `.transform()` in stile Zod).
- Type inference dallo schema al tipo (l'utente ha già il tipo; lo schema è vincolato a quello).
- Dependency injection (container, reflection, decoratori).
- i18n dei messaggi di errore (la libreria produce dati strutturati; l'i18n è responsabilità di un layer esterno).
- Caching delle chiamate esterne dentro i constraint.
- Serializzazione dello schema (JSON Schema, OpenAPI, ecc.). Può essere un'estensione futura, non è nel core.
- Logging, metriche, tracing (responsabilità dell'integratore; la libreria espone dati sufficienti perché siano aggiungibili all'esterno).

## 11. Questioni aperte

Da chiudere prima o durante l'implementazione:

1. **Ordine di produzione degli errori**: deterministico (in base a ordine di dichiarazione) o non garantito (dato il parallelismo). Impatto sui test e sull'esperienza utente.
2. **Configurabilità del parallelismo**: fornire un'opzione per forzare esecuzione sequenziale? Utile in scenari a risorse limitate.
3. **Abort early globale**: opzione per interrompere al primo errore raccogliendo solo quello. Default `false`, ma utile averlo per certi casi di rate limiting o fail-fast.
4. **Identità dei constraint uguali applicati più volte**: se lo stesso constraint è applicato due volte allo stesso campo con parametri diversi, come li distinguiamo negli errori? Via `constraintCode` unico? Via discriminante aggiuntivo?
5. **Sintassi della factory `array()`**: argomenti posizionali (`array(itemSchema, [arrayConstraints])`) vs oggetto di configurazione (`array({ items, constraints })`). La prima è più corta per il caso comune (solo item schema); la seconda è più esplicita e scalabile. Valutare coerenza con le altre factory (`object`, `conditional`).
6. **Interazione `optional` e proprietà di oggetto**: con `exactOptionalPropertyTypes`, la differenza tra `{ x?: T }` (proprietà assente consentita) e `{ x: T | undefined }` (proprietà presente ma valore undefined) è rilevante. Scegliere quale forma produce `optional` su una proprietà di `object`, e se permettere entrambe.

## 12. Roadmap di implementazione

Ordine suggerito, da affinare:

1. Tipi core: `Schema<T>` base class e gerarchia (PrimitiveSchema, ObjectSchema, ArraySchema), `ConstraintInterface`, `ValidationContext`, `ValidationResult`, `ValidationError`.
2. Engine asincrono: traversal, accumulazione errori, propagazione path, parallelismo di base.
3. Primi constraint di test (non orientati a business specifico, solo per esercitare l'engine): `NotNull`, `Satisfies(predicate)`.
4. Chain aggregator e meccanismo skip.
5. Gruppi di validazione nel context e filtro nell'engine.
6. `conditional` schema con selector e mappa di casi.
7. `optional` e `nullable` come wrapper schema.
8. `lazy` per ricorsione.
9. Path query sul context.
10. Pattern DataLoader documentato ed esempi end-to-end.
11. Estensione a Tuple, Record, Set.
12. Type-level conformance check: vincolare `Schema<T>` a essere coerente con `T`.

## 13. Glossario

- **Schema**: descrittore di come validare un dato di tipo `T`. Istanza di una classe concreta (PrimitiveSchema, ObjectSchema, ArraySchema, ConditionalSchema, ...). Per convenzione ogni schema ha una factory function in lowercase (`object`, `array`, `conditional`, ...) come API d'uso pubblica.
- **Constraint**: regola di validazione applicabile a un valore. Oggetto che implementa l'interfaccia `ConstraintInterface<T>`, dichiara `code`, `errorCodes`, `handledTypes`, `groups`; implementa `validate(value, ctx)` asincrono che registra violazioni via context.
- **ValidationEngine**: classe che espone il metodo `validate(value, schema, options)` per eseguire la validazione. Unica API pubblica per invocare la validazione; va istanziata esplicitamente.
- **Context**: oggetto che accompagna la validazione. Esiste in due forme: `ValidationContext` (read-only, per selector) e `MutableValidationContext` (read + `addError`, per constraint). Contiene path, root, parent, location, groups, custom e il metodo `get` per path query.
- **ConstraintViolation**: struttura che un constraint registra via `ctx.addError(violation)`. Contiene `errorCode` (obbligatorio), `message`, `params`, `cause`, `path` (tutti opzionali). L'engine la completa con `constraintCode` e `path` producendo un `ValidationError`.
- **TypeKind**: enumerazione chiusa dei tipi di dato riconosciuti da Placet a livello runtime (`'string' | 'number' | 'boolean' | 'bigint' | 'date' | 'object' | 'array' | 'any'`). Usata nel campo `handledTypes` dei constraint.
- **Chain**: aggregatore di constraint che impone esecuzione sequenziale con short-circuit al primo fallimento. Implementato come constraint-aggregatore che gira sub-context isolati per rilevare fallimenti dei constraint incapsulati.
- **Group**: etichetta applicata a un constraint tramite il parametro `groups` del costruttore; l'engine esegue solo i constraint i cui gruppi intersecano quelli attivi nel context. Un constraint senza gruppi dichiarati è attivo per qualunque invocazione.
- **Conditional**: schema router che, dato un selector e una mappa di casi, sceglie a runtime quale schema applicare.
- **Selector**: funzione pura e sincrona `(context, value) => key` usata dal conditional per scegliere il caso.
- **Optional**: wrapper schema che estende uno schema rendendolo applicabile anche al valore `undefined` (o all'assenza della proprietà in un oggetto). Produce `Schema<T | undefined>`. Riconosce solo `undefined`; per accettare anche `null` comporre con `nullable`.
- **Nullable**: wrapper schema che estende uno schema rendendolo applicabile anche al valore `null`. Produce `Schema<T | null>`. Riconosce solo `null`; componibile con optional.
- **Location**: campo strutturato del context che espone la posizione del valore corrente rispetto al suo contenitore (indice se in array, chiave se in oggetto), usabile dai selector e dai constraint senza dover fare parsing del path testuale.
- **Path query**: stringa di path assoluto (inizia con `$`) che identifica una posizione nell'albero del dato validato. Accessibile via `ctx.get(path)`. Sintassi minimale: `.` per identificatori, `[n]` per indici, `["string"]` per chiavi con caratteri speciali. Percorsi inesistenti ritornano `undefined`.
- **Lazy**: wrapper che posticipa la risoluzione di uno schema al momento dell'uso, necessario per schema ricorsivi.
- **Registry**: meccanismo opzionale (non nel core) per dichiarare e risolvere schema per nome, utile in progetti grandi.
- **Skipped**: constraint non eseguito per ragioni tracciate (chain precedente fallita, gruppo non attivo, caso non matchato, ecc.), riportato nel risultato per trasparenza.
