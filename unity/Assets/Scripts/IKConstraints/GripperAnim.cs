/*
 *The MIT License (MIT)
 * Copyright (c) 2025 NewMedia Centre - Delft University of Technology
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#region

using System;
using Schema.Socket.Realtime;
using UnityEngine;

#endregion

/// <summary>
/// The GripperAnim class manages the animation of a robotic gripper in Unity.
/// It handles the initialization of the animator and gripper components,
/// and responds to digital output changes from a session client to control
/// the gripping state of the robotic arm.
/// </summary>
[RequireComponent(typeof(Animator))]
[RequireComponent(typeof(Gripper))]
public class GripperAnim : MonoBehaviour
{
    private Animator _animController;
    private Gripper _gripper;
    private bool _hasGrippingParam;
    private bool _warnedMissingGrippingParam;

    /// <summary>
    /// Initializes the animator and gripper components, and sets up event listeners
    /// for digital output changes from the session client.
    /// </summary>
    private void Start()
    {
        _animController = GetComponent<Animator>();

        _gripper = GetComponent<Gripper>();
        if (_gripper != null)
        {
            _gripper.SetAnchorPosition(new Vector3(0, 0, -1.453f));
        }

        // Cache whether the animator has the expected bool parameter
        _hasGrippingParam = HasBoolParameter(_animController, "Gripping");

        if (SessionClient.Instance == null)
        {
            return;
        }

        SessionClient.Instance.OnDigitalOutputChanged += SetGripperAnim;
        SessionClient.Instance.OnRealtimeData += SetGripperAnim;
    }

    /// <summary>
    /// Sets the gripper animation state based on the received RealtimeDataOut object.
    /// </summary>
    /// <param name="obj">The RealtimeDataOut object containing digital output data.</param>
    private void SetGripperAnim(RealtimeDataOut obj)
    {
        if (obj == null) return;
        SetGripperAnim(Convert.ToBoolean(obj.DigitalOutputs));
    }

    /// <summary>
    /// Updates the gripper animation state and performs gripping or ungripping actions
    /// based on the provided state.
    /// </summary>
    /// <param name="state">True to grip, false to ungrip.</param>
    private void SetGripperAnim(bool state)
    {
        if (_hasGrippingParam)
        {
            _animController.SetBool("Gripping", !state);
        }
        else if (!_warnedMissingGrippingParam)
        {
            Debug.LogWarning("Animator missing 'Gripping' bool parameter on " + gameObject.name);
            _warnedMissingGrippingParam = true;
        }

        if (_gripper == null)
            return;

        if (state == true)
            _gripper.Grab();
        else
            _gripper.UnGrab();
    }

    private bool HasBoolParameter(Animator anim, string parameterName)
    {
        if (anim == null) return false;
        foreach (var p in anim.parameters)
        {
            if (p.type == AnimatorControllerParameterType.Bool && p.name == parameterName)
                return true;
        }
        return false;
    }
}
