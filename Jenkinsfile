pipeline {
    agent any

    environment {
        OCI_REGISTRY  = 'iad.ocir.io'
        OCI_NAMESPACE = 'idxyojfomq6q'
        BACK_IMAGE_NAME = 'backend'
        FRONT_IMAGE_NAME = 'frontend'
        KUBECONFIG    = '/home/opc/.kube/config'
        OCI_CONFIG_FILE = '/var/lib/jenkins/.oci/config'
        REPO_URL      = 'https://github.com/KevinSancz/jenkins-back.git'
        KUBE_API      = '150.230.171.99:6443'  // API pública del clúster OKE
        CLUSTER_ID    = 'ocid1.cluster.oc1.iad.aaaaaaaaq4k6vopup3yyac3776sfrbr47jm2qp5j7db2upvmdcbwqn2rc55q'
    }

    stages {
        stage('Checkout Repositories') {
            steps {
                dir('repo') {
                    git url: "${REPO_URL}", branch: 'master'
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend Image') {
                    steps {
                        dir('repo/Back') {
                            script {
                                dockerImageBackend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER}")
                            }
                        }
                    }
                }
                stage('Frontend Image') {
                    steps {
                        dir('repo/Front') {
                            script {
                                dockerImageFrontend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER}")
                            }
                        }
                    }
                }
            }
        }

        stage('Push Docker Images to OCI Registry') {
            parallel {
                stage('Push Backend Image') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageBackend.push("${BUILD_NUMBER}")
                                dockerImageBackend.push("latest")
                            }
                        }
                    }
                }
                stage('Push Frontend Image') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageFrontend.push("${BUILD_NUMBER}")
                                dockerImageFrontend.push("latest")
                            }
                        }
                    }
                }
            }
        }

        stage('Verify Kubernetes Connection') {
            steps {
                script {
                    def kubeTest = sh(
                        script: "kubectl cluster-info --kubeconfig=${KUBECONFIG}",
                        returnStdout: true
                    ).trim()
                    echo "✅ Kubernetes Cluster Info: ${kubeTest}"
                }
            }
        }

        stage('Ensure OCI Registry Secret Exists') {
            steps {
                script {
                    def secretExists = sh(
                        script: "kubectl get secret oci-registry-secret --kubeconfig=${KUBECONFIG} || echo 'NOT_FOUND'",
                        returnStdout: true
                    ).trim()

                    if (secretExists.contains("NOT_FOUND")) {
                        echo "🛑 Secret not found, creating it..."
                        sh """
                        kubectl create secret docker-registry oci-registry-secret \
                        --docker-server=${OCI_REGISTRY} \
                        --docker-username='${OCI_NAMESPACE}/kevin.sanchez@ebiw.mx' \
                        --docker-password='${DOCKER_PASS}' \
                        --docker-email='kevin.sanchez@ebiw.mx' \
                        --kubeconfig=${KUBECONFIG}
                        """
                    } else {
                        echo "✅ OCI Registry Secret already exists."
                    }
                }
            }
        }

        stage('Deploy to OKE') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: '15050001', 
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    script {
                        // Generar el token de acceso para Kubernetes
                        def kubeTokenJson = sh(
                            script: """
                                OCI_CONFIG_FILE=${OCI_CONFIG_FILE} \
                                oci ce cluster generate-token \
                                    --cluster-id ${CLUSTER_ID} \
                                    --region iad
                            """,
                            returnStdout: true
                        ).trim()

                        if (!kubeTokenJson || !kubeTokenJson.contains("token")) {
                            error "❌ Failed to generate Kubernetes token. Verify OCI CLI and cluster configuration."
                        }

                        def kubeToken = sh(
                            script: "echo '${kubeTokenJson}' | jq -r '.status.token'",
                            returnStdout: true
                        ).trim()

                        if (!kubeToken) {
                            error "❌ Failed to extract token from JSON. Verify jq installation and JSON structure."
                        }

                        withEnv(["KUBECONFIG=${KUBECONFIG}", "KUBE_TOKEN=${kubeToken}"]) {
                            sh """
                                echo "🔄 Cloning repo to get Kubernetes manifests..."
                                rm -rf temp_repo || true
                                git clone ${REPO_URL} temp_repo

                                echo "🔄 Replacing build number in manifests..."
                                sed -i "s/\\\${BUILD_NUMBER}/${BUILD_NUMBER}/g" temp_repo/k8s/backend-deployment.yaml
                                sed -i "s/\\\${BUILD_NUMBER}/${BUILD_NUMBER}/g" temp_repo/k8s/frontend-deployment.yaml

                                echo "🚀 Applying Kubernetes manifests..."
                                kubectl --token=$KUBE_TOKEN apply -f temp_repo/k8s/backend-deployment.yaml
                                kubectl --token=$KUBE_TOKEN apply -f temp_repo/k8s/frontend-deployment.yaml

                                echo "🕒 Waiting for deployment rollout..."
                                kubectl --token=$KUBE_TOKEN rollout status deployment/backend --timeout=90s || exit 1
                                kubectl --token=$KUBE_TOKEN rollout status deployment/frontend --timeout=90s || exit 1

                                echo "✅ Deployment successful!"
                                rm -rf temp_repo
                            """
                        }
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh """
                echo "🧹 Cleaning up local Docker images..."
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER} || true
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER} || true
                docker image prune -f || true
                """
            }
        }
    }
}
