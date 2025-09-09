import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";

export default function App() {
  // === Hooks: ต้องอยู่บนสุด เสมอ และจำนวน/ลำดับเหมือนเดิมทุกครั้ง ===
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [hasMediaPerm, setHasMediaPerm] = useState<boolean | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPerm(res.status === "granted");
    })();
  }, []);

  // รี-assert ไฟฉายหลังสลับกล้อง/พร้อมใช้งาน (workaround บางรุ่น)
  useEffect(() => {
    if (cameraReady && facing === "back" && torchOn) {
      const id = setTimeout(() => setTorchOn(true), 50);
      return () => clearTimeout(id);
    }
  }, [cameraReady, facing]);

  // === Actions ===
  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
    setImageUri(photo.uri);
    // setTorchOn(false); // ถ้าอยากปิดไฟหลังถ่าย
  };

  const saveToGallery = async () => {
    if (!imageUri) return;
    await MediaLibrary.createAssetAsync(imageUri);
    setImageUri(null);
  };

  const retake = () => setImageUri(null);

  const toggleFacing = () => {
    setTorchOn(false);
    setCameraReady(false);
    setFacing(prev => (prev === "back" ? "front" : "back"));
  };

  const toggleTorch = () => {
    if (facing === "back" && cameraReady) {
      setTorchOn(t => !t);
    }
  };

  // === Single return: เรนเดอร์ทุกสถานะด้วย JSX เงื่อนไข ===
  const needCameraGrant = camPerm && !camPerm.granted;
  const loadingPerm = !camPerm || hasMediaPerm === null;

  return (
    <View style={styles.container}>
      {/* Loading / Permissions */}
      {loadingPerm && (
        <View style={styles.center}>
          <Text>กำลังตรวจสิทธิ์…</Text>
        </View>
      )}

      {!loadingPerm && needCameraGrant && (
        <View style={styles.center}>
          <Text style={{ marginBottom: 12 }}>ต้องอนุญาตใช้กล้องก่อน</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestCamPerm}>
            <Text style={styles.btnText}>อนุญาตการใช้กล้อง</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loadingPerm && !needCameraGrant && hasMediaPerm === false && (
        <View style={styles.center}>
          <Text>ต้องอนุญาตคลังรูปภาพเพื่อบันทึกรูป</Text>
        </View>
      )}

      {/* Preview mode */}
      {!loadingPerm && !needCameraGrant && hasMediaPerm && imageUri && (
        <>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={retake}>
              <Text style={styles.btnText}>ถ่ายใหม่</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={saveToGallery}>
              <Text style={styles.btnText}>บันทึกลงอัลบั้ม</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Camera mode */}
      {!loadingPerm && !needCameraGrant && hasMediaPerm && !imageUri && (
        <>
          <CameraView
            key={facing} // สำคัญ: บังคับ re-mount เมื่อสลับกล้อง
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={() => setCameraReady(true)}
            enableTorch={cameraReady && facing === "back" && torchOn}
          />

          <View style={styles.topBar}>
            <TouchableOpacity style={styles.roundBtn} onPress={toggleFacing}>
              <Text style={styles.iconText}>↺</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roundBtn, torchOn && styles.roundBtnActive, facing !== "back" && { opacity: 0.4 }]}
              onPress={toggleTorch}
              disabled={facing !== "back" || !cameraReady}
            >
              <Text style={styles.iconText}>⚡</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.captureBar}>
            <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  camera: { flex: 1, width: "100%" },
  topBar: {
    position: "absolute", top: 24, left: 16, right: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  captureBar: { position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  roundBtn: { height: 44, width: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  roundBtnActive: { backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 1, borderColor: "#fff" },
  iconText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  shutterOuter: { height: 76, width: 76, borderRadius: 38, borderWidth: 6, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  shutterInner: { height: 52, width: 52, borderRadius: 26, backgroundColor: "#fff" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#000", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  primaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#0ea5e9", alignItems: "center" },
  secondaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#334155", alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  preview: { flex: 1, width: "100%", backgroundColor: "#000" },
});
