using System;
using UnityEngine;
using Crease;

public class CreasePreview : MonoBehaviour
{
    [Serializable] public class Sample { public float time; public Vector3 position, up, forward, head, top, bottom; }
    [Serializable] public class Clip { public string id, hand; public Sample[] samples; }
    [Serializable] public class Library { public int schemaVersion; public string sourceHash; public Clip[] clips; }

    private Library library;
    private Camera eye;
    private GameObject ballObj;
    private PlayerBodyUnity playerBody;
    private PhysicalBatUnity physicalBat;
    private CreasePhysics creasePhysics;

    private int selectedClip;
    private float clock;
    private float lastMove;
    private float mouseDistance;
    private Vector2 gesture;
    private bool playing;
    private bool trackpad;
    private string status = "CREASE Unity — Full Parity Engine & Visual Rig Active";

    private Material willowMat, whiteMat, greenMat, pitchMat;
    private Transform bowlerRoot, bowlingArm, bowlingHand;
    private float deliveryClock = -1f;
    private bool deliveryReleased;

    private Material CreateMaterial(Color color)
    {
        return new Material(Shader.Find("Standard")) { color = color };
    }

    private GameObject Shape(string name, PrimitiveType type, Vector3 pos, Vector3 scale, Material mat, bool collision = true)
    {
        var obj = GameObject.CreatePrimitive(type);
        obj.name = name;
        obj.transform.position = pos;
        obj.transform.localScale = scale;
        obj.GetComponent<Renderer>().sharedMaterial = mat;
        if (!collision) Destroy(obj.GetComponent<Collider>());
        return obj;
    }

    void Start()
    {
        var text = Resources.Load<TextAsset>("crease-motions");
        if (!text)
        {
            status = "Missing motion export asset. Run node tools/export-unity.mjs.";
            enabled = false;
            return;
        }

        library = JsonUtility.FromJson<Library>(text.text);
        physicalBat = new PhysicalBatUnity();
        creasePhysics = new CreasePhysics();

        willowMat = CreateMaterial(new Color(0.82f, 0.65f, 0.38f));
        whiteMat = CreateMaterial(new Color(0.94f, 0.94f, 0.89f));
        greenMat = CreateMaterial(new Color(0.13f, 0.28f, 0.14f));
        pitchMat = CreateMaterial(new Color(0.65f, 0.53f, 0.34f));

        // Environment
        Shape("Outfield Stadium", PrimitiveType.Cube, new Vector3(0, -0.15f, 20), new Vector3(100, 0.2f, 100), greenMat);
        Shape("Worn Turf Pitch", PrimitiveType.Cube, new Vector3(0, -0.035f, 9), new Vector3(3.05f, 0.06f, 22), pitchMat);

        foreach (float z in new[] { -0.65f, 19.47f })
        {
            Shape("Crease Line", PrimitiveType.Cube, new Vector3(0, 0.003f, z), new Vector3(3, 0.004f, 0.025f), whiteMat, false);
            for (int i = -1; i <= 1; i++)
            {
                Shape("Stump", PrimitiveType.Cylinder, new Vector3(i * 0.114f, 0.355f, z - 0.6f), new Vector3(0.035f, 0.355f, 0.035f), willowMat);
            }
        }

        BuildBowler();

        // Lighting
        var light = new GameObject("Sun").AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.3f;
        light.shadows = LightShadows.Soft;
        light.transform.rotation = Quaternion.Euler(38, -28, 0);
        RenderSettings.ambientLight = new Color(0.55f, 0.62f, 0.70f);

        // Camera
        eye = new GameObject("Striker Eyes").AddComponent<Camera>();
        eye.tag = "MainCamera";
        eye.fieldOfView = 82;
        eye.nearClipPlane = 0.02f;
        eye.farClipPlane = 200;
        eye.backgroundColor = new Color(0.57f, 0.73f, 0.84f);
        eye.clearFlags = CameraClearFlags.SolidColor;
        eye.gameObject.AddComponent<AudioListener>();

        // Player Rig & Visuals
        var playerObj = new GameObject("CREASE 3D Player Body");
        playerBody = playerObj.AddComponent<PlayerBodyUnity>();
        playerBody.BuildPlayer();

        // Practice Ball
        ballObj = Shape("Aerodynamic Ball", PrimitiveType.Sphere, new Vector3(0, 2.0f, 18.0f), Vector3.one * 0.0722f, whiteMat);

        ApplySample(library.clips[0].samples[0]);
    }

    private void BuildBowler()
    {
        bowlerRoot = new GameObject("Bowler Action Rig").transform;
        bowlerRoot.position = new Vector3(0, 0, 18.6f);
        var body = Shape("Bowler Body", PrimitiveType.Capsule, bowlerRoot.position + new Vector3(0, 1.0f, 0), new Vector3(.42f, 1.0f, .30f), greenMat);
        body.transform.SetParent(bowlerRoot, true);
        var shoulder = Shape("Bowler Shoulder", PrimitiveType.Sphere, bowlerRoot.position + new Vector3(0, 1.65f, 0), new Vector3(.62f, .28f, .34f), greenMat);
        shoulder.transform.SetParent(bowlerRoot, true);
        var head = Shape("Bowler Head", PrimitiveType.Sphere, bowlerRoot.position + new Vector3(0, 2.05f, 0), new Vector3(.25f, .30f, .25f), whiteMat);
        head.transform.SetParent(bowlerRoot, true);
        bowlingArm = Shape("Bowler Bowling Arm", PrimitiveType.Capsule, bowlerRoot.position + new Vector3(.42f, 1.55f, -.05f), new Vector3(.11f, .52f, .11f), whiteMat, false).transform;
        bowlingArm.SetParent(bowlerRoot, true);
        bowlingHand = Shape("Bowler Ball Hand", PrimitiveType.Sphere, bowlerRoot.position + new Vector3(.42f, 1.05f, -.10f), new Vector3(.13f, .13f, .13f), whiteMat, false).transform;
        bowlingHand.SetParent(bowlerRoot, true);
    }

    private void ApplySample(Sample s)
    {
        Quaternion batRot = Quaternion.LookRotation(s.forward, s.up);
        physicalBat.Step(s.position, batRot, 1f, 1f, 0.001f);
        playerBody.UpdatePose(s.top, s.bottom, physicalBat.position, physicalBat.rotation, physicalBat.topGripForce, physicalBat.bottomGripForce);

        eye.transform.position = s.head;
        eye.transform.rotation = Quaternion.Euler(19.5f, 0, 0);
    }

    private void Swing()
    {
        clock = 0;
        playing = true;
        status = "Shot Motion: " + library.clips[selectedClip].id.ToUpper() + " (" + library.clips[selectedClip].hand + ")";
    }

    private void BowlDelivery()
    {
        deliveryClock = 0f;
        deliveryReleased = false;
        creasePhysics.isDead = true;
        status = "Bowler loading — read the arm and wrist, then choose your shot";
    }

    private void AnimateDelivery(float dt)
    {
        if (deliveryClock < 0 || bowlerRoot == null) return;
        deliveryClock += dt;
        float t = Mathf.Clamp01(deliveryClock / 0.95f);
        float lift = Mathf.Sin(t * Mathf.PI);
        bowlingArm.localRotation = Quaternion.Euler(-35f - lift * 125f, 0f, -25f + lift * 95f);
        bowlingHand.localPosition = new Vector3(.42f + lift * .12f, 1.08f + lift * .65f, -.10f - lift * .35f);
        if (!deliveryReleased && deliveryClock >= .72f)
        {
            deliveryReleased = true;
            Vector3 releasePos = bowlerRoot.position + new Vector3(.30f, 2.18f, -.48f);
            creasePhysics.ReleaseBall(releasePos, new Vector3(-.1f, -1.2f, -28f), new Vector3(20f, 0f, 10f), new Vector3(.1f, 0f, .99f));
            status = "Ball released — track seam, bounce and wrist angle";
        }
        if (deliveryClock > 1.4f) deliveryClock = -1f;
    }

    void Update()
    {
        if (library == null) return;

        if (Input.GetKeyDown(KeyCode.Space)) BowlDelivery();
        if (Input.GetKeyDown(KeyCode.Return)) Swing();

        Vector2 delta = trackpad ? Input.mouseScrollDelta : new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y"));
        if (delta.sqrMagnitude > 0.01f && Input.mousePosition.y < Screen.height - 125)
        {
            gesture += delta;
            mouseDistance += delta.magnitude;
            lastMove = Time.time;
        }

        if (mouseDistance > 2 && Time.time - lastMove > 0.12f)
        {
            float angle = Mathf.Atan2(gesture.y, gesture.x) * Mathf.Rad2Deg;
            string shot = Mathf.Abs(angle) > 150 ? "pull" : Mathf.Abs(angle) < 25 ? "cut" : angle > 115 ? "ondrive" : angle < 65 ? "cover" : "straight";
            string hand = library.clips[selectedClip].hand;

            if (hand == "left")
            {
                if (shot == "pull") shot = "cut";
                else if (shot == "cut") shot = "pull";
                else if (shot == "cover") shot = "ondrive";
                else if (shot == "ondrive") shot = "cover";
            }

            int index = Array.FindIndex(library.clips, c => c.id == shot && c.hand == hand);
            if (index >= 0) selectedClip = index;
            Swing();
            gesture = Vector2.zero;
            mouseDistance = 0;
        }

        if (mouseDistance <= 2 && Time.time - lastMove > 0.2f)
        {
            gesture = Vector2.zero;
            mouseDistance = 0;
        }
    }

    void FixedUpdate()
    {
        AnimateDelivery(Time.fixedDeltaTime);
        if (library != null && playing)
        {
            clock += Time.fixedDeltaTime;
            var samples = library.clips[selectedClip].samples;
            int i = Mathf.Min(Mathf.FloorToInt(clock / 0.01f), samples.Length - 1);
            ApplySample(samples[i]);
            if (i == samples.Length - 1) playing = false;
        }

        if (creasePhysics != null && !creasePhysics.isDead)
        {
            creasePhysics.Step(Time.fixedDeltaTime);
            if (ballObj != null)
            {
                ballObj.transform.position = creasePhysics.position;
            }
        }
    }

    void OnGUI()
    {
        GUILayout.BeginArea(new Rect(15, 15, Mathf.Min(850, Screen.width - 30), 125), GUI.skin.box);
        GUILayout.Label("CREASE · Unity Parity Engine & Visual Rig");
        GUILayout.Label(status);

        if (library != null)
        {
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Previous Shot")) { selectedClip = (selectedClip + library.clips.Length - 1) % library.clips.Length; Swing(); }
            if (GUILayout.Button("Play Motion [Enter]")) Swing();
            if (GUILayout.Button("Next Shot")) { selectedClip = (selectedClip + 1) % library.clips.Length; Swing(); }
            if (GUILayout.Button("Bowl Delivery [Space]")) BowlDelivery();
            trackpad = GUILayout.Toggle(trackpad, "Two-finger scroll");
            GUILayout.EndHorizontal();
        }

        GUILayout.Label("Mouse Gesture Engine: Left = Pull, Right = Cut, Up = Drive. Obstacle & Pitch physics active.");
        GUILayout.EndArea();
    }
}
