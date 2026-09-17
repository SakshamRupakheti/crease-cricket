using System;
using UnityEngine;

namespace Crease
{
    public class PlayerBodyUnity : MonoBehaviour
    {
        public Material shirtMaterial;
        public Material skinMaterial;
        public Material whiteMaterial;
        public Material navyMaterial;
        public Material rubberMaterial;
        public Material willowMaterial;

        public Transform torso;
        public Transform head;
        public Transform helmet;
        public Transform batRig;
        public Transform topGlove;
        public Transform bottomGlove;
        public Transform[] legPads = new Transform[2];
        public Transform[][] gloveFingers = new Transform[2][];

        private Material CreateMaterial(Color color, float roughness = 0.8f)
        {
            Material mat = new Material(Shader.Find("Standard"));
            mat.color = color;
            mat.SetFloat("_Glossiness", 1.0f - roughness);
            return mat;
        }

        public void BuildPlayer()
        {
            shirtMaterial = CreateMaterial(new Color(0.09f, 0.21f, 0.28f), 0.7f); // Navy #183748
            skinMaterial = CreateMaterial(new Color(0.67f, 0.47f, 0.34f), 0.8f);  // Skin #ac7957
            whiteMaterial = CreateMaterial(new Color(0.98f, 0.97f, 0.91f), 0.6f); // White #fbf7e9
            navyMaterial = CreateMaterial(new Color(0.09f, 0.21f, 0.28f), 0.5f);
            rubberMaterial = CreateMaterial(new Color(0.10f, 0.16f, 0.16f), 0.9f);
            willowMaterial = CreateMaterial(new Color(0.91f, 0.81f, 0.59f), 0.64f);

            // Torso & Head
            GameObject torsoObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            torsoObj.name = "Torso";
            torsoObj.transform.SetParent(transform, false);
            torsoObj.transform.localPosition = new Vector3(0, 1.17f, 0);
            torsoObj.transform.localScale = new Vector3(0.47f, 0.69f, 0.31f);
            torsoObj.GetComponent<Renderer>().sharedMaterial = shirtMaterial;
            torso = torsoObj.transform;

            GameObject headObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            headObj.name = "Head";
            headObj.transform.SetParent(transform, false);
            headObj.transform.localPosition = new Vector3(0, 1.68f, 0);
            headObj.transform.localScale = new Vector3(0.27f, 0.35f, 0.25f);
            headObj.GetComponent<Renderer>().sharedMaterial = skinMaterial;
            head = headObj.transform;

            // Helmet
            GameObject helmetObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            helmetObj.name = "Helmet";
            helmetObj.transform.SetParent(head, false);
            helmetObj.transform.localPosition = new Vector3(0, 0.05f, 0);
            helmetObj.transform.localScale = new Vector3(1.05f, 0.45f, 1.05f);
            helmetObj.GetComponent<Renderer>().sharedMaterial = navyMaterial;
            helmet = helmetObj.transform;

            // Leg Pads with 6 vertical padding ribs
            for (int leg = 0; leg < 2; leg++)
            {
                float side = leg == 0 ? -1f : 1f;
                GameObject padObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
                padObj.name = leg == 0 ? "Left Leg Pad" : "Right Leg Pad";
                padObj.transform.SetParent(transform, false);
                padObj.transform.localPosition = new Vector3(side * 0.18f, 0.34f, -0.085f);
                padObj.transform.localScale = new Vector3(0.22f, 0.68f, 0.11f);
                padObj.GetComponent<Renderer>().sharedMaterial = whiteMaterial;
                legPads[leg] = padObj.transform;

                // 6 Vertical Ribs
                for (int r = 0; r < 6; r++)
                {
                    GameObject rib = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    rib.transform.SetParent(padObj.transform, false);
                    rib.transform.localPosition = new Vector3((r - 2.5f) * 0.14f, 0, -0.52f);
                    rib.transform.localScale = new Vector3(0.06f, 0.48f, 0.06f);
                    rib.GetComponent<Renderer>().sharedMaterial = whiteMaterial;
                }

                // Navy Straps
                for (int s = 0; s < 2; s++)
                {
                    GameObject strap = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    strap.transform.SetParent(padObj.transform, false);
                    strap.transform.localPosition = new Vector3(0, (s == 0 ? -0.2f : 0.2f), -0.53f);
                    strap.transform.localScale = new Vector3(1.05f, 0.04f, 0.08f);
                    strap.GetComponent<Renderer>().sharedMaterial = navyMaterial;
                }
            }

            // Batting Gloves with 5 Articulated Finger Segment Groups
            for (int g = 0; g < 2; g++)
            {
                GameObject gloveObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                gloveObj.name = g == 0 ? "Top Glove" : "Bottom Glove";
                gloveObj.transform.SetParent(transform, false);
                gloveObj.transform.localScale = new Vector3(0.086f, 0.080f, 0.058f);
                gloveObj.GetComponent<Renderer>().sharedMaterial = whiteMaterial;

                gloveFingers[g] = new Transform[5];
                for (int f = 0; f < 5; f++)
                {
                    GameObject fingerRoot = new GameObject($"Finger_{f}");
                    fingerRoot.transform.SetParent(gloveObj.transform, false);
                    fingerRoot.transform.localPosition = new Vector3(f == 4 ? 0.45f : -0.35f + f * 0.22f, f == 4 ? -0.1f : -0.3f, 0.2f);

                    for (int j = 0; j < 3; j++)
                    {
                        GameObject seg = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                        seg.transform.SetParent(fingerRoot.transform, false);
                        seg.transform.localPosition = new Vector3(0, -j * 0.25f, j * 0.15f);
                        seg.transform.localScale = new Vector3(0.12f, 0.18f, 0.12f);
                        seg.GetComponent<Renderer>().sharedMaterial = whiteMaterial;
                    }
                    gloveFingers[g][f] = fingerRoot.transform;
                }

                if (g == 0) topGlove = gloveObj.transform;
                else bottomGlove = gloveObj.transform;
            }

            // Willow Bat Rig
            GameObject batObj = new GameObject("Physical Willow Bat");
            batObj.transform.SetParent(transform, false);

            GameObject blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
            blade.name = "Shaped Willow Blade";
            blade.transform.SetParent(batObj.transform, false);
            blade.transform.localPosition = new Vector3(0, 0.0275f, 0);
            blade.transform.localScale = new Vector3(0.108f, 0.615f, 0.05f);
            blade.GetComponent<Renderer>().sharedMaterial = willowMaterial;

            GameObject handle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            handle.name = "Oval Handle with Splice";
            handle.transform.SetParent(batObj.transform, false);
            handle.transform.localPosition = new Vector3(0, 0.49f, 0);
            handle.transform.localScale = new Vector3(0.033f, 0.18f, 0.033f);
            handle.GetComponent<Renderer>().sharedMaterial = rubberMaterial;

            // Rubber Grip Wrap Rings
            for (int w = 0; w < 16; w++)
            {
                GameObject wrap = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                wrap.transform.SetParent(handle.transform, false);
                wrap.transform.localPosition = new Vector3(0, -0.4f + w * 0.05f, 0);
                wrap.transform.localScale = new Vector3(1.1f, 0.02f, 1.1f);
                wrap.GetComponent<Renderer>().sharedMaterial = rubberMaterial;
            }

            batRig = batObj.transform;
        }

        public Vector2 CalculateHandCompliance(float topForce, float bottomForce, float maxThreshold = 400f)
        {
            float topDef = Mathf.Min(0.04f, (topForce / maxThreshold) * 0.04f);
            float botDef = Mathf.Min(0.04f, (bottomForce / maxThreshold) * 0.04f);
            return new Vector2(topDef, botDef);
        }

        public void UpdatePose(Vector3 topHandTarget, Vector3 bottomHandTarget, Vector3 batPos, Quaternion batRot, float topForce = 0, float bottomForce = 0)
        {
            if (batRig != null)
            {
                batRig.position = batPos;
                batRig.rotation = batRot;
            }

            Vector2 comp = CalculateHandCompliance(topForce, bottomForce);

            if (topGlove != null)
            {
                topGlove.position = topHandTarget + new Vector3(0, -comp.x * 0.5f, comp.x * 0.5f);
            }
            if (bottomGlove != null)
            {
                bottomGlove.position = bottomHandTarget + new Vector3(0, -comp.y * 0.5f, comp.y * 0.5f);
            }
        }
    }
}
