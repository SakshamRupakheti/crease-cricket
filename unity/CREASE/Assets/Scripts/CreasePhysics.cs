using System;
using UnityEngine;

namespace Crease
{
    public struct PitchWearState
    {
        public float wearFactor;
        public float restitutionMult;
        public float frictionMult;
        public float seamKick;
    }

    public struct ObstacleHit
    {
        public string type;
        public Vector3 normal;
        public float depth;
    }

    public class CreasePhysics
    {
        public const float STEP = 0.001f;
        public const float GRAVITY = 9.81f;
        public const float AIR_DENSITY = 1.2f;
        public const float BALL_MASS = 0.1595f;
        public const float BALL_RADIUS = 0.0361f;
        public const float DRAG_COEFF = 0.47f;
        public const float SPIN_LIFT_COEFF = 0.18f;

        public Vector3 position;
        public Vector3 velocity;
        public Vector3 spin;
        public Vector3 seamNormal;
        public int bounces;
        public bool isDead;
        public string result;

        public static PitchWearState GetPitchWearProperties(float x, float z, int wearIndex = 0)
        {
            float distFront = Mathf.Abs(z - 1.0f);
            float distBack = Mathf.Abs(z + 18.4f);
            bool inCreaseZone = (distFront < 1.8f || distBack < 1.8f) && Mathf.Abs(x) < 1.0f;
            float wearFactor = Mathf.Min(1.0f, (wearIndex * 0.005f) + (inCreaseZone ? 0.25f : 0.0f));

            return new PitchWearState
            {
                wearFactor = wearFactor,
                restitutionMult = 1.0f - (wearFactor * 0.08f),
                frictionMult = 1.0f + (wearFactor * 0.15f),
                seamKick = wearFactor * 0.025f
            };
        }

        public static ObstacleHit? SweepObstacles(Vector3 pos)
        {
            // Stumps: z around 1.0
            if (pos.x >= -0.1143f && pos.x <= 0.1143f && pos.y >= 0.0f && pos.y <= 0.711f && pos.z >= 0.95f && pos.z <= 1.05f)
            {
                return new ObstacleHit { type = "stump", normal = Vector3.back, depth = 0.035f };
            }

            // Striker Leg Pads
            if ((pos.x >= -0.35f && pos.x <= -0.05f || pos.x >= 0.05f && pos.x <= 0.35f) &&
                pos.y >= 0.05f && pos.y <= 0.55f && pos.z >= 0.85f && pos.z <= 1.15f)
            {
                return new ObstacleHit { type = "leg_pad", normal = Vector3.back, depth = 0.025f };
            }

            return null;
        }

        public void ReleaseBall(Vector3 releasePos, Vector3 releaseVel, Vector3 releaseSpin, Vector3 releaseSeam)
        {
            position = releasePos;
            velocity = releaseVel;
            spin = releaseSpin;
            seamNormal = releaseSeam.normalized;
            bounces = 0;
            isDead = false;
            result = null;
        }

        public void Step(float dt = STEP)
        {
            if (isDead) return;

            float speed = velocity.magnitude;
            float area = Mathf.PI * BALL_RADIUS * BALL_RADIUS;

            Vector3 gravity = new Vector3(0, -GRAVITY, 0);
            Vector3 drag = -0.5f * AIR_DENSITY * area * DRAG_COEFF * speed * velocity / BALL_MASS;

            Vector3 spinDir = Vector3.Cross(spin, velocity).normalized;
            float ratio = spin.magnitude * BALL_RADIUS / Mathf.Max(0.01f, speed);
            Vector3 spinForce = 0.5f * AIR_DENSITY * area * SPIN_LIFT_COEFF * Mathf.Clamp01(ratio) * speed * speed * spinDir / BALL_MASS;

            velocity += (gravity + drag + spinForce) * dt;
            position += velocity * dt;

            // Pitch bounce
            if (position.y <= BALL_RADIUS && velocity.y < 0)
            {
                bool onPitch = Mathf.Abs(position.x) < 1.525f && position.z >= -19.12f && position.z <= 1.0f;
                float e = onPitch ? 0.64f : 0.35f;
                float mu = onPitch ? 0.32f : 0.65f;

                if (onPitch)
                {
                    PitchWearState wear = GetPitchWearProperties(position.x, position.z, bounces);
                    e *= wear.restitutionMult;
                    mu *= wear.frictionMult;

                    if (wear.seamKick > 0 && Mathf.Abs(seamNormal.y) < 0.3f)
                    {
                        velocity.x += (bounces % 2 == 0 ? 1f : -1f) * wear.seamKick;
                    }
                }

                velocity.y = -velocity.y * e;
                velocity.x *= (1f - mu * 0.1f);
                velocity.z *= (1f - mu * 0.1f);
                position.y = BALL_RADIUS;
                bounces++;

                if (Mathf.Abs(velocity.y) < 0.2f && !onPitch)
                {
                    velocity.y = 0;
                }
            }

            if (position.z < -25f || position.z > 30f || position.y > 40f)
            {
                isDead = true;
                result = "DEAD";
            }
        }
    }
}
