// superscores a sciolyff interpreter
//
// this currently does not support tracks or penalties, so the superscore
// will be for all teams combined without any penalties.
// the exported function returns a `rep` object, which
// can be passed back into the interpreter class for handling.

import { Interpreter, PlacingRep, SciOlyFF, Team, TeamRep } from "./types";

const fsn = (t: { school: string; city?: string; state: string }) =>
  `${t.school}|${t.city ?? ""}|${t.state}`;

export default (interpreter: Interpreter): SciOlyFF => {
  const teams = interpreter.tournament.topTeamsPerSchool?.map((t) => ({
    number: t.number,
    school: t.school,
    state: t.state,
    "school abbreviation": t.schoolAbbreviation,
    // track: t.track,
    // suffix: t.suffix,
    city: t.city,
    disqualified: t.disqualified,
    exhibition: t.exhibition,
  })) as TeamRep[];

  const teamNumbers = teams.reduce((acc, t) => {
    acc.set(fsn(t), t.number);
    return acc;
  }, new Map<string, number>());

  const eventMaxPlacings = interpreter.events.reduce((acc, e) => {
    acc.set(e.name, e.maximumPlace as number);
    return acc;
  }, new Map<string, number>());

  // lowest place of all teams of a school, by event
  const minPlacingsBySchool = new Map<number, Map<string, number>>();
  interpreter.placings.forEach((placing) => {
    const event = placing.event?.name as string;
    const school = teamNumbers.get(fsn(placing.team as Team)) as number;

    if (!minPlacingsBySchool.has(school)) {
      minPlacingsBySchool.set(school, new Map());
    }
    if (!minPlacingsBySchool.get(school)?.has(event)) {
      minPlacingsBySchool
        .get(school)
        ?.set(event, placing.isolatedPoints as number);
    } else {
      minPlacingsBySchool
        .get(school)
        ?.set(
          event,
          Math.min(
            minPlacingsBySchool.get(school)?.get(event) as number,
            placing.isolatedPoints as number
          )
        );
    }
  });

  const placingsRep: PlacingRep[] = [];
  for (const [teamNumber, eventPlacings] of minPlacingsBySchool) {
    for (const [event, place] of eventPlacings) {
      const n =
        (eventMaxPlacings.get(event) as number) +
        (interpreter.tournament?.nOffset as number);
      const rep: PlacingRep = {
        event,
        team: teamNumber,
      } as PlacingRep;
      if (place === n) {
        rep.participated = true;
      } else if (place === n + 1) {
        rep.participated = false;
      } else if (place === n + 2) {
        rep.disqualified = true;
      } else {
        rep.place = place;
      }

      placingsRep.push(rep);
    }
  }

  return {
    Tournament: interpreter.tournament.rep,
    Events: interpreter.events.map((e) => e.rep),
    Teams: teams,
    Placings: placingsRep,
    Tracks: [],
    Penalties: [],
  };
};