import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const recommendations =
    await prisma.reorderRecommendation.findMany({
      where: { status: "ACTIVE" },
      select: {
        storeId: true,
        productId: true,
      },
    });

  const alerts = await prisma.stockAlert.findMany({
    where: { status: "ACTIVE" },
    select: {
      storeId: true,
      productId: true,
      alertType: true,
    },
  });

  const recommendationKeys = recommendations.map(
    (r) => `${r.storeId}:${r.productId}`
  );

  const alertKeys = alerts.map(
    (a) =>
      `${a.storeId}:${a.productId}:${a.alertType}`
  );

  const duplicateRecommendations =
    recommendationKeys.length -
    new Set(recommendationKeys).size;

  const duplicateAlerts =
    alertKeys.length -
    new Set(alertKeys).size;

  console.log("");
  console.log("LAYER 8 DUPLICATE TEST");
  console.log("----------------------");
  console.log(
    `Active recommendations: ${recommendations.length}`
  );
  console.log(
    `Duplicate recommendations: ${duplicateRecommendations}`
  );
  console.log(
    `Active alerts: ${alerts.length}`
  );
  console.log(
    `Duplicate alerts: ${duplicateAlerts}`
  );
  console.log("");

  if (duplicateRecommendations === 0) {
    console.log(
      "PASS: No duplicate active recommendations"
    );
  } else {
    console.log(
      "FAIL: Duplicate active recommendations found"
    );
  }

  if (duplicateAlerts === 0) {
    console.log(
      "PASS: No duplicate active alerts"
    );
  } else {
    console.log(
      "FAIL: Duplicate active alerts found"
    );
  }

  if (
    duplicateRecommendations === 0 &&
    duplicateAlerts === 0
  ) {
    console.log("");
    console.log(
      "PASS: Layer 8 duplicate prevention verified"
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FAIL:", error.message);
  await prisma.$disconnect();
  process.exit(1);
});