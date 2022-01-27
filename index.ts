import admin, { AppOptions, credential } from "firebase-admin";

const serviceAccount = require("../cloneFrom.json");
const serviceAccount2 = require("../cloneTo.json");

const firstAppConfig: AppOptions = {
  credential: credential.cert(serviceAccount),
  databaseURL: "https://chess-48117.firebaseio.com",
};

const secondaryAppConfig: AppOptions = {
  credential: credential.cert(serviceAccount2),
  databaseURL: "https://dorjoo-dc7f1.firebaseio.com",
};

const first = admin.initializeApp(firstAppConfig, "first");

const secondary = admin.initializeApp(secondaryAppConfig, "secondary");

const firstFirestore = first.firestore();
const seconderyFirestore = secondary.firestore();

const worker = async () => {
  let collections = await firstFirestore.listCollections();
  let firstFirestoreColIds = collections.map((col) => col.id);

  await Promise.allSettled(
    firstFirestoreColIds.map(async (collectionName) => {
      let { docs } = await firstFirestore.collection(collectionName).get();
      await Promise.allSettled(
        docs.map(async (doc) => {
          await seconderyFirestore
            .doc(`${collectionName}/${doc.id}`)
            .set(doc.data());

          let subCollections = await firstFirestore
            .doc(`${collectionName}/${doc.id}`)
            .listCollections();

          if (!subCollections.length) return;

          await Promise.allSettled(
            subCollections.map(async (col) => {
              let { docs } = await firstFirestore
                .collection(`${collectionName}/${doc.id}/${col.id}`)
                .get();

              await Promise.allSettled(
                docs.map(async (subDoc) => {
                  await seconderyFirestore
                    .doc(`${collectionName}/${doc.id}/${col.id}/${subDoc.id}`)
                    .set(subDoc.data());
                })
              );
            })
          );
        })
      );
    })
  );
  console.log("Done");
};

worker();
