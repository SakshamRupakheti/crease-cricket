using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

[InitializeOnLoad]
public static class CreaseSetup
{
    const string ScenePath="Assets/Scenes/CreaseNets.unity";
    static CreaseSetup(){EditorApplication.delayCall+=()=>{if(!File.Exists(ScenePath)&&!EditorApplication.isPlayingOrWillChangePlaymode)CreateScene();};}
    [MenuItem("CREASE/Create or open migration preview")]
    public static void CreateScene()
    {
        if(File.Exists(ScenePath)){EditorSceneManager.OpenScene(ScenePath);return;}
        Directory.CreateDirectory("Assets/Scenes");
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        new GameObject("CREASE preview bootstrap").AddComponent<CreasePreview>();
        Time.fixedDeltaTime=.005f;PlayerSettings.companyName="CREASE";PlayerSettings.productName="CREASE Unity Preview";
        PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;
        EditorSceneManager.SaveScene(scene,ScenePath);
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};AssetDatabase.SaveAssets();
    }
    public static void Validate()
    {
        CreateScene();var asset=Resources.Load<TextAsset>("crease-motions");
        if(asset==null)throw new System.Exception("Motion export missing");
        var data=JsonUtility.FromJson<CreasePreview.Library>(asset.text);
        if(data.schemaVersion!=1||data.clips.Length!=38)throw new System.Exception("Expected 38 exported clips");
        Debug.Log("CREASE_SETUP_VALIDATED: 38 motion clips, preview scene and scripts imported.");
    }
}
