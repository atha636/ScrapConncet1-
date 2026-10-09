// Environmental impact estimates. These are ROUGH, rounded averages of how
// much CO2-equivalent recycling a kg of each material avoids compared with
// making it new / landfilling it — real figures vary a lot by exact material
// (e.g. aluminium saves far more than steel), so everything surfaced to
// users is labelled "estimated". Tune the numbers here in one place; nothing
// else in the app hardcodes them.
const CO2_KG_SAVED_PER_KG = {
  metal: 2.5,
  plastic: 1.5,
  paper: 1.0,
  "e-waste": 2.0,
  glass: 0.3,
  other: 0.5,
};

// One tree absorbs roughly 21 kg of CO2 per year — used only for the
// friendly "equivalent to X trees for a year" line.
const CO2_KG_PER_TREE_YEAR = 21;

const round1 = (n) => Math.round(n * 10) / 10;

// byType: { metal: kgRecycled, plastic: kgRecycled, ... }
function computeImpact(byType) {
  let totalKg = 0;
  let co2Kg = 0;
  const breakdown = [];

  for (const [scrapType, kg] of Object.entries(byType)) {
    if (!kg || kg <= 0) continue;
    const saved = kg * (CO2_KG_SAVED_PER_KG[scrapType] ?? CO2_KG_SAVED_PER_KG.other);
    totalKg += kg;
    co2Kg += saved;
    breakdown.push({ scrapType, kg: round1(kg), co2Kg: round1(saved) });
  }

  breakdown.sort((a, b) => b.kg - a.kg);

  return {
    totalKg: round1(totalKg),
    co2Kg: round1(co2Kg),
    treesEquivalent: Math.round(co2Kg / CO2_KG_PER_TREE_YEAR),
    breakdown,
  };
}

// Aggregation stages that turn completed pickups into per-scrap-type kg.
// Uses the collector's recorded actual weights when settlement captured
// them, otherwise the requester's estimate. Pickups whose weight settlement
// is still disputed are left out until resolved, so impact never counts a
// weight someone is contesting.
function kgLineStages(match) {
  return [
    {
      $match: {
        status: "completed",
        "settlement.status": { $ne: "disputed" },
        ...match,
      },
    },
    {
      $project: {
        partnerName: "$dropOff.partnerName",
        partnerCity: "$dropOff.partnerCity",
        lines: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$settlement.actualItems", []] } }, 0] },
            {
              $map: {
                input: "$settlement.actualItems",
                as: "i",
                in: { scrapType: "$$i.scrapType", kg: "$$i.actualWeightKg" },
              },
            },
            {
              $map: {
                input: { $ifNull: ["$items", []] },
                as: "i",
                in: { scrapType: "$$i.scrapType", kg: "$$i.estimatedWeightKg" },
              },
            },
          ],
        },
      },
    },
    { $unwind: "$lines" },
  ];
}

function weightByTypePipeline(match) {
  return [
    ...kgLineStages(match),
    { $group: { _id: "$lines.scrapType", kg: { $sum: { $ifNull: ["$lines.kg", 0] } } } },
  ];
}

// Same weights, grouped by where they were delivered. Only pickups whose
// delivery has been recorded are counted.
function weightByPartnerPipeline(match) {
  return [
    ...kgLineStages({ "dropOff.at": { $ne: null }, ...match }),
    {
      $group: {
        _id: { name: "$partnerName", city: "$partnerCity" },
        kg: { $sum: { $ifNull: ["$lines.kg", 0] } },
      },
    },
    { $sort: { kg: -1 } },
  ];
}

module.exports = { computeImpact, weightByTypePipeline, weightByPartnerPipeline, CO2_KG_SAVED_PER_KG };