/**
 * Personlige valg og terskler som ikke står i loggen.
 * Tersklene er hypotesen fra resultatkort v1. v0.2.1 låser dem ikke.
 */
export const oversiktConfig = {
  fornavn: "Dusan",
  initialer: "DJ",
  /** Dagens grense L, i kroner. Null skjuler grensen. */
  dagsgrenseKr: 2500 as number | null,
  /** Når brukt andel av grensen er minst dette, vises varslet. */
  naerGrense: 0.7,
  /** Gevinst når dagens resultat er minst denne andelen av L. */
  gevinstAndel: 0.1,
  /** Stabil innenfor ± denne andelen av L. */
  stabilAndel: 0.1,
  /** Megatap når dagens resultat er minst så lavt, som andel av L. */
  megatapAndel: -0.75,
  /**
   * Valgfri referanse for prosent i grafen.
   * Null betyr at aksen viser kroner, ikke en oppdiktet prosent.
   */
  referanseKontoKr: null as number | null,
};

export type OversiktConfig = typeof oversiktConfig;
