using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

internal static class CreaseAndroidBuild
{
    [MenuItem("CREASE/Build Android APK")]
    private static void BuildApk()
    {
        if (!BuildPipeline.IsBuildTargetSupported(BuildPipeline.GetBuildTargetGroup(EditorUserBuildSettings.activeBuildTarget), BuildTarget.Android))
        {
            EditorUtility.DisplayDialog("Android module missing", "Install Android Build Support, Android SDK & NDK Tools, and OpenJDK in Unity Hub first.", "OK");
            return;
        }

        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
        var output = Path.Combine("Builds", "Android", "CREASE.apk");
        Directory.CreateDirectory(Path.GetDirectoryName(output));
        var scenes = EditorBuildSettingsScene.GetActiveSceneList(EditorBuildSettings.scenes);
        if (scenes.Length == 0)
        {
            EditorUtility.DisplayDialog("No scene", "Create the migration preview scene first with CREASE > Create or open migration preview.", "OK");
            return;
        }

        var report = BuildPipeline.BuildPlayer(scenes, output, BuildTarget.Android, BuildOptions.None);
        if (report.summary.result != BuildResult.Succeeded)
            Debug.LogError($"CREASE Android build failed: {report.summary.result}");
        else
            Debug.Log($"CREASE Android APK written to {Path.GetFullPath(output)}");
    }
}
