import styles from "./Test.module.css";
import Image from "next/image";

function Test({ name }) {
  return (
    <div>
      <h1 className={styles.hello}>Hello {name}!</h1>
      <h3>
        Environment Variable example:{" "}
        {process.env.TEST ||
          "PLEASE CREATE A .env.local file and define TEST variable"}
      </h3>
      <Image
        src="/mongo.png"
        width={900}
        height={500}
        alt="MongoDB Image"
      ></Image>
    </div>
  );
}

export default Test;
