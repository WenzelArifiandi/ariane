// Quick runtime import check for three and postprocessing
import("three")
  .then(() => console.log("three ok"))
  .catch((e) => {
    console.error("three import failed", e);
    process.exit(1);
  });
import("postprocessing")
  .then(() => console.log("postprocessing ok"))
  .catch((e) => {
    console.error("postprocessing import failed", e);
    process.exit(1);
  });
