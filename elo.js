const fs = require("fs");
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");

// Initialize team ratings to 1500
const team_ratings = {
  Forge: [1500],
  "York United": [1500],
  Pacific: [1500],
  "HFX Wanderers": [1500],
  Valour: [1500],
  Cavalry: [1500],
  Edmonton: [1500],
};

// Define system constraints
const MAXIMUM_RATING_CHANGE = 32;
const CSV_FILE_NAME = "./team_ratings_2019.csv";
const CSV_COLUMNS = generateCsvColumns();

// Read match data from csv
fs.createReadStream("./2019_match_data.csv")
  .pipe(parse({ delimiter: ",", from_line: 2 }))
  .on("data", function (row) {
    const home_team = row[0];
    const away_team = row[1];
    const home_score = parseInt(row[2]);
    const away_score = parseInt(row[3]);

    // Calculate expected win probability for each team
    const home_rating =
      team_ratings[home_team][team_ratings[home_team].length - 1];
    const away_rating =
      team_ratings[away_team][team_ratings[away_team].length - 1];
    const rating_diff = home_rating - away_rating;

    const home_expected_win_prob = 1 / (1 + 10 ** (-rating_diff / 400));
    const away_expected_win_prob = 1 - home_expected_win_prob;

    // Update team ratings based on game result
    // TODO: Implement GD into the calculation
    let result = 0;
    if (home_score > away_score) {
      result = 1;
    } else if (home_score === away_score) {
      result = 0.5;
    }

    const rating_change_home =
      MAXIMUM_RATING_CHANGE * (result - home_expected_win_prob);
    const rating_change_away =
      MAXIMUM_RATING_CHANGE * (1 - result - away_expected_win_prob);

    team_ratings[home_team].push(Math.round(home_rating + rating_change_home));
    team_ratings[away_team].push(Math.round(away_rating + rating_change_away));
  })
  .on("end", writeCsv)
  .on("error", function (error) {
    console.log(`::ERROR:: ${error.message}`);
  });

function writeCsv() {
  const stringifier = stringify({ header: true, columns: CSV_COLUMNS });
  const writableStream = fs.createWriteStream(CSV_FILE_NAME);

  for (team in team_ratings) {
    const ratings = team_ratings[team];
    stringifier.write([team, 1500, ...ratings]);
  }

  stringifier.pipe(writableStream);
  console.log("::INFO:: Finished writing file");
}

function generateCsvColumns() {
  const columns = ["Team", "Rating"];
  for (let i = 1; i < 31; i++) {
    columns.push(`MD${i}`);
  }
  return columns;
}
