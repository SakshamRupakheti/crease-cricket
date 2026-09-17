using System;
using UnityEngine;

namespace Crease
{
    public class PhysicalBatUnity
    {
        public float mass = 1.18f;
        public float centerOfMassY = 0.04f;
        public Vector3 inertia = new Vector3(0.105f, 0.0025f, 0.105f);
        public float gravity = 9.81f;

        public float gripStiffness = 30000f;
        public float gripDamping = 180f;
        public float wristStiffness = 28f;
        public float wristDamping = 2.4f;

        public Vector3 position;
        public Vector3 velocity;
        public Quaternion rotation = Quaternion.identity;
        public Vector3 angularVelocity;

        public float topGripForce;
        public float bottomGripForce;
        public int contacts;
        public string lastObstacleContact;

        public bool isReady = false;
        private Vector3 lastTopTarget;
        private Vector3 lastBottomTarget;
        private Vector3 lastPosition;

        public void Reset()
        {
            isReady = false;
            position = Vector3.zero;
            velocity = Vector3.zero;
            rotation = Quaternion.identity;
            angularVelocity = Vector3.zero;
            topGripForce = 0;
            bottomGripForce = 0;
            contacts = 0;
            lastObstacleContact = null;
        }

        public Vector3 Point(Vector3 local)
        {
            Vector3 offset = new Vector3(local.x, local.y - centerOfMassY, local.z);
            return (rotation * offset) + position;
        }

        public void Impulse(Vector3 impulse, Vector3 atPoint)
        {
            velocity += impulse / mass;
            Vector3 lever = atPoint - position;
            Vector3 torque = Vector3.Cross(lever, impulse);

            Vector3 localTorque = Quaternion.Inverse(rotation) * torque;
            Vector3 localAlpha = new Vector3(localTorque.x / inertia.x, localTorque.y / inertia.y, localTorque.z / inertia.z);
            angularVelocity += rotation * localAlpha;
        }

        public void Step(Vector3 targetPos, Quaternion targetRot, float topGripStrength = 1f, float bottomGripStrength = 1f, float dt = 0.001f)
        {
            Vector3 axis = targetRot * Vector3.up;
            Vector3 topTarget = targetPos + axis * 0.56f;
            Vector3 bottomTarget = targetPos + axis * 0.465f;

            if (!isReady)
            {
                rotation = targetRot;
                position = targetPos + axis * centerOfMassY;
                lastTopTarget = topTarget;
                lastBottomTarget = bottomTarget;
                isReady = true;
            }

            Vector3 netForce = new Vector3(0, -mass * gravity, 0);
            Vector3 netTorque = Vector3.zero;

            // Top hand spring
            if (topGripStrength > 0)
            {
                Vector3 gripPoint = Point(new Vector3(0, 0.56f, 0));
                Vector3 lever = gripPoint - position;
                Vector3 pointVel = Vector3.Cross(angularVelocity, lever) + velocity;
                Vector3 desiredVel = Vector3.ClampMagnitude((topTarget - lastTopTarget) / dt, 15f);
                Vector3 f = Vector3.ClampMagnitude(((topTarget - gripPoint) * gripStiffness + (desiredVel - pointVel) * gripDamping) * topGripStrength, 800f);
                netForce += f;
                netTorque += Vector3.Cross(lever, f);
                topGripForce = f.magnitude;
            }

            // Bottom hand spring
            if (bottomGripStrength > 0)
            {
                Vector3 gripPoint = Point(new Vector3(0, 0.465f, 0));
                Vector3 lever = gripPoint - position;
                Vector3 pointVel = Vector3.Cross(angularVelocity, lever) + velocity;
                Vector3 desiredVel = Vector3.ClampMagnitude((bottomTarget - lastBottomTarget) / dt, 15f);
                Vector3 f = Vector3.ClampMagnitude(((bottomTarget - gripPoint) * gripStiffness + (desiredVel - pointVel) * gripDamping) * bottomGripStrength, 800f);
                netForce += f;
                netTorque += Vector3.Cross(lever, f);
                bottomGripForce = f.magnitude;
            }

            // Wrist torque alignment
            float totalGrip = topGripStrength + bottomGripStrength;
            if (totalGrip > 0.001f)
            {
                Quaternion error = targetRot * Quaternion.Inverse(rotation);
                if (error.w < 0) error = new Quaternion(-error.x, -error.y, -error.z, -error.w);
                Vector3 axisError = new Vector3(error.x, error.y, error.z);
                float n = axisError.magnitude;
                if (n > 1e-8f) axisError *= (2f * Mathf.Atan2(n, error.w) / n);
                netTorque += axisError * wristStiffness - angularVelocity * wristDamping;
            }

            velocity += (netForce / mass) * dt;
            Vector3 localTorque = Quaternion.Inverse(rotation) * netTorque;
            Vector3 localAlpha = new Vector3(localTorque.x / inertia.x, localTorque.y / inertia.y, localTorque.z / inertia.z);
            angularVelocity += (rotation * localAlpha) * dt;
            angularVelocity = Vector3.ClampMagnitude(angularVelocity, 45f);

            position += velocity * dt;
            float spin = angularVelocity.magnitude;
            if (spin > 1e-8f)
            {
                rotation = Quaternion.AngleAxis(spin * dt * Mathf.Rad2Deg, angularVelocity.normalized) * rotation;
            }

            // Obstacle collisions
            ObstacleHit? obs = CreasePhysics.SweepObstacles(position);
            if (obs.HasValue)
            {
                Vector3 norm = obs.Value.normal;
                float relV = Vector3.Dot(velocity, norm);
                if (relV < 0)
                {
                    Impulse(-1.3f * relV * mass * norm, position);
                    contacts++;
                    lastObstacleContact = obs.Value.type;
                }
            }

            // Ground support samples
            if (position.y < 0.006f)
            {
                position.y = 0.006f;
                if (velocity.y < 0)
                {
                    Impulse(new Vector3(0, -1.18f * velocity.y * mass, 0), position);
                    angularVelocity *= 0.94f;
                    contacts++;
                }
            }

            lastTopTarget = topTarget;
            lastBottomTarget = bottomTarget;
            lastPosition = position;
        }
    }
}
